import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  // Supabase 연결 테스트: 인증 세션 조회
  const { error } = await supabase.auth.getSession();
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, message: 'Supabase 연결 성공!' });
} 