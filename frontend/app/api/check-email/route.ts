import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 환경변수 확인
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase 환경변수가 설정되지 않았습니다. check-email API가 비활성화됩니다.');
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(req: Request) {
    // 환경변수가 없으면 에러 반환
    if (!supabase) {
      return NextResponse.json({ error: '서비스가 설정되지 않았습니다.' }, { status: 503 });
    }

    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: '이메일이 올바르지 않습니다.' }, { status: 400 });
    }
    try {
      // @ts-expect-error: email 필터는 타입 정의에 없지만 실제로 동작함 (Supabase SDK 버전에 따라 다름)
      const { data, error } = await supabase.auth.admin.listUsers({ email: email.toLowerCase() });
      console.log('listUsers result:', { data, error }); // 추가
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const exists = data?.users?.length > 0;
      return NextResponse.json({ exists });
    } catch (e) {
      console.error('API Route Exception:', e);
      return NextResponse.json({ error: '서버 내부 오류' }, { status: 500 });
    }
  }
