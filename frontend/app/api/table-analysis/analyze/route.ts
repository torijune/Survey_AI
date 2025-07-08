import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  const selectedKey = formData.get("selected_key");
  if (!file || typeof file === "string" || !selectedKey || typeof selectedKey !== "string") {
    return NextResponse.json({ error: "파일과 selected_key가 필요합니다." }, { status: 400 });
  }

  const backendForm = new FormData();
  backendForm.append("file", file);
  backendForm.append("selected_key", selectedKey);
  backendForm.append("analysis_type", "true");
  backendForm.append("lang", "한국어");

  const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8000";
  const backendApi = `${backendUrl}/api/langgraph`;

  const backendRes = await fetch(backendApi, {
    method: "POST",
    body: backendForm,
  });
  const data = await backendRes.text();
  return new Response(data, {
    status: backendRes.status,
    headers: { "Content-Type": backendRes.headers.get("Content-Type") || "application/json" },
  });
} 