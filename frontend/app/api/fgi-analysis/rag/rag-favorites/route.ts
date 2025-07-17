import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:8000';
  const url = new URL(req.url);
  const query = url.search ? url.search : '';
  // GET 요청은 rag-favorites로 프록시
  const response = await fetch(`${backendUrl}/api/fgi-rag/rag-favorites${query}`);
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
} 

export async function POST(req: NextRequest) {
  const body = await req.json();
  const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:8000';
  const response = await fetch(`${backendUrl}/api/fgi-rag/favorites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}