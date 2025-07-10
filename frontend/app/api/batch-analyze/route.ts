import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawDataFile = formData.get("raw_data_file") as File | null;
    const lang = formData.get("lang")?.toString() || "한국어";
    const userId = formData.get("user_id")?.toString() || "";
    const batchTestTypes = formData.get("batch_test_types")?.toString() || "{}";
    const fileName = formData.get("file_name")?.toString() || "";

    if (!file) {
      return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8000";
    const backendForm = new FormData();
    backendForm.append("file", file);
    if (rawDataFile) backendForm.append("raw_data_file", rawDataFile);
    backendForm.append("lang", lang);
    backendForm.append("user_id", userId);
    backendForm.append("batch_test_types", batchTestTypes);
    backendForm.append("file_name", fileName);

    // 백엔드 배치 분석 API 호출
    const response = await fetch(`${backendUrl}/api/batch-analyze`, {
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
    console.error("Batch analysis error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 