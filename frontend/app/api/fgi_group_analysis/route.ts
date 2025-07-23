import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const guide_file_name = searchParams.get('guide_file_name');
    const user_id = searchParams.get('user_id');

    if (!guide_file_name || !user_id) {
      return NextResponse.json(
        { error: 'guide_file_name과 user_id가 필요합니다.' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8000";
    const params = new URLSearchParams({
      guide_file_name,
      user_id
    });

    const response = await fetch(`${baseUrl}/api/group-analysis/by-guide?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in group analysis API:', error);
    return NextResponse.json(
      { error: '그룹 분석 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const guide_file_name = formData.get('guide_file_name') as string;
    const user_id = formData.get('user_id') as string;
    const group_names = formData.get('group_names') as string;
    const job_id = formData.get('job_id') as string;

    if (!guide_file_name || !user_id) {
      return NextResponse.json(
        { error: 'guide_file_name과 user_id가 필요합니다.' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8000";
    
    // 그룹 비교 분석인지 확인
    if (group_names) {
      const compareFormData = new FormData();
      compareFormData.append('guide_file_name', guide_file_name);
      compareFormData.append('user_id', user_id);
      compareFormData.append('group_names', group_names);
      if (job_id) {
        compareFormData.append('job_id', job_id);
      }
      
      const response = await fetch(`${baseUrl}/api/group-analysis/compare`, {
        method: 'POST',
        body: compareFormData
      });
      
      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }
      
      const data = await response.json();
      return NextResponse.json(data);
    }
    
    // 기존 그룹 분석 조회
    const formDataToSend = new FormData();
    formDataToSend.append('guide_file_name', guide_file_name);
    formDataToSend.append('user_id', user_id);

    const response = await fetch(`${baseUrl}/api/group-analysis/by-guide`, {
      method: 'POST',
      body: formDataToSend
    });
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in group analysis API:', error);
    return NextResponse.json(
      { error: '그룹 분석 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
