import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("job_id");

    if (!jobId) {
      return NextResponse.json({ error: "job_id가 필요합니다." }, { status: 400 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8000";
    
    // 백엔드 배치 다운로드 API 호출 (Clean Architecture)
    const response = await fetch(`${backendUrl}/api/v1/batch-analysis/download?job_id=${jobId}`, {
      method: "GET",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    // 파일 다운로드 응답 처리
    const contentType = response.headers.get("content-type");
    const contentDisposition = response.headers.get("content-disposition");
    
    if (contentType && contentType.includes("application/json")) {
      // JSON 응답인 경우
      const data = await response.json();
      return NextResponse.json(data);
    } else {
      // 파일 다운로드인 경우
      const buffer = await response.arrayBuffer();
      const headers = new Headers();
      headers.set("Content-Type", contentType || "application/octet-stream");
      if (contentDisposition) {
        headers.set("Content-Disposition", contentDisposition);
      }
      
      return new NextResponse(buffer, {
        status: 200,
        headers,
      });
    }
  } catch (error) {
    console.error("Batch download error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 