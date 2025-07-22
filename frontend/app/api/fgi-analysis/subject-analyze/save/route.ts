import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // 프론트에서 JSON으로 보낼 수도 있으니, JSON 파싱
  const body = await req.json();
  const formData = new FormData();
  formData.append('user_id', body.user_id);
  formData.append('guide_file_name', body.guide_file_name);
  formData.append('fgi_file_id', body.fgi_file_id);
  formData.append('fgi_file_name', body.fgi_file_name);
  formData.append('topics', JSON.stringify(body.topics));
  formData.append('results', JSON.stringify(body.results));
  formData.append('title', body.title);
  formData.append('description', body.description);
  formData.append('group_name', body.group_name);

  const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:8000';
  const response = await fetch(`${backendUrl}/api/fgi-rag/save-subject-analysis`, {
    method: 'POST',
    body: formData,
    // headers는 FormData 사용 시 브라우저/런타임이 자동으로 설정
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
} 