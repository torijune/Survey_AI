import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const guide_file_name = searchParams.get('guide_file_name');
  const user_id = searchParams.get('user_id');

  if (!guide_file_name) {
    return NextResponse.json({ error: 'guide_file_name is required' }, { status: 400 });
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:8000';
    const params = new URLSearchParams({
      guide_file_name,
      ...(user_id && { user_id })
    });

    const response = await fetch(`${backendUrl}/api/group-analysis/by-guide?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch group analyses');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching group analyses:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:8000';

    const response = await fetch(`${backendUrl}/api/group-analysis/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to compare groups');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error comparing groups:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
