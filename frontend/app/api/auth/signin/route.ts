import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SignInRequestDto } from '@/lib/dto/auth/SignInRequestDto';

// 환경변수 확인
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase 환경변수가 설정되지 않았습니다. signin API가 비활성화됩니다.');
}

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function POST(req: Request) {
  // 환경변수가 없으면 에러 반환
  if (!supabase) {
    return NextResponse.json({ error: '서비스가 설정되지 않았습니다.' }, { status: 503 });
  }

  const body: SignInRequestDto = await req.json();
  if (!body.email || !body.password) {
    return NextResponse.json({ error: '이메일과 비밀번호를 입력하세요.' }, { status: 400 });
  }
  const { error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 401 });
  return NextResponse.json({ success: true });
} 