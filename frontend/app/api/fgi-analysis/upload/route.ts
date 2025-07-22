import { NextRequest, NextResponse } from 'next/server';

// 그냥 업로드는 아니고 임베딩까지 하는 업로드
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:8000';
  const response = await fetch(`${backendUrl}/api/fgi-rag/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
} 