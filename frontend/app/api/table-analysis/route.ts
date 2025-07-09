import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawDataFile = formData.get("raw_data_file") as File | null;
    const analysisType = formData.get("analysis_type")?.toString() || "parse";
    const selectedKey = formData.get("selected_key")?.toString() || "";
    const lang = formData.get("lang")?.toString() || "한국어";
    const userId = formData.get("user_id")?.toString() || "";

    if (!file) {
      return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8000";
    const backendForm = new FormData();
    backendForm.append("file", file);
    if (rawDataFile) backendForm.append("raw_data_file", rawDataFile);

    let backendApi = "";
    
    if (analysisType === "analyze") {
      // AI 분석 실행
      backendApi = `${backendUrl}/api/table-analyze`;
      backendForm.append("selected_key", selectedKey);
      backendForm.append("lang", lang);
      backendForm.append("user_id", userId);
      if (formData.get("analysis_type") === "batch" && formData.get("batch_test_types")) {
        backendForm.append("analysis_type", "batch");
        backendForm.append("batch_test_types", formData.get("batch_test_types")!.toString());
      }
    } else if (analysisType === "recommend_test_types") {
      // 통계 검정 방법 추천 요청 프록시
      backendApi = `${backendUrl}/api/table-analyze`;
      backendForm.append("analysis_type", "recommend_test_types");
      backendForm.append("lang", lang);
      backendForm.append("user_id", userId);
    } else {
      // 테이블 파싱만
      backendApi = `${backendUrl}/api/table-parse`;
      if (selectedKey) backendForm.append("selected_key", selectedKey);
    }

    const response = await fetch(backendApi, {
      method: "POST",
      body: backendForm,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Table analysis error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 