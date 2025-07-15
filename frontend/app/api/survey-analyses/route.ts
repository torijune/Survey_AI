import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 환경변수 확인
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase 환경변수가 설정되지 않았습니다. survey-analyses API가 비활성화됩니다.');
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(req: Request) {
  // 환경변수가 없으면 에러 반환
  if (!supabase) {
    return NextResponse.json({ error: '서비스가 설정되지 않았습니다.' }, { status: 503 });
  }

  try {
    const { title, description, uploaded_file_name, analysis_result, question_key, question } = await req.json();
    
    // Authorization header에서 토큰 추출
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    
    // 토큰으로 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 });
    }

    // 설문 분석 저장
    const { data, error } = await supabase
      .from('survey_analyses')
      .insert({
        user_id: user.id,
        title,
        description,
        uploaded_file_name,
        analysis_result,
        question_key,   // 추가
        question        // 추가
      })
      .select()
      .single();

    if (error) {
      console.error('설문 분석 저장 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('설문 분석 저장 중 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  // 환경변수가 없으면 에러 반환
  if (!supabase) {
    return NextResponse.json({ error: '서비스가 설정되지 않았습니다.' }, { status: 503 });
  }

  try {
    // Authorization header에서 토큰 추출
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    
    // 토큰으로 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 });
    }

    // 사용자의 설문 분석 목록 조회
    const { data, error } = await supabase
      .from('survey_analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('설문 분석 조회 오류:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('설문 분석 조회 중 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 