import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:8000';
  const response = await fetch(`${backendUrl}/api/fgi-rag/analyze`, {
    method: 'POST',
    body: formData,
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
} 