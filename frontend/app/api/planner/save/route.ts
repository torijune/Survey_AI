import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const json = await req.json();
  const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8000";
  const response = await fetch(`${backendUrl}/api/planner/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json),
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
} 