import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  // 분석 실행인지, 단순 파싱(업로드)인지 구분
  // 분석 실행: analysis_type === 'langgraph' 또는 'analyze' 등
  // 파싱만: analysis_type 없거나 'parse', 'visualization' 등
  const analysisType = formData.get("analysis_type")?.toString() || "parse";
  const selectedKey = formData.get("selected_key")?.toString() || "";
  const lang = formData.get("lang")?.toString() || "한국어";
  const userId = formData.get("user_id")?.toString() || "";

  const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8000";
  let backendApi = "";
  const backendForm = new FormData();
  backendForm.append("file", file);

  if (analysisType === "langgraph" || analysisType === "analyze") {
    // AI 분석 실행
    backendApi = `${backendUrl}/api/langgraph`;
    backendForm.append("analysis_type", "true");
    backendForm.append("selected_key", selectedKey);
    backendForm.append("lang", lang);
    backendForm.append("user_id", userId);
  } else {
    // 테이블 파싱/시각화
    backendApi = `${backendUrl}/api/visualization`;
    // 필요시 selected_key 등 추가
    if (selectedKey) backendForm.append("selected_key", selectedKey);
  }

  const response = await fetch(backendApi, {
    method: "POST",
    body: backendForm,
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
} 