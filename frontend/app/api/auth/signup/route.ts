import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SignUpRequestDto } from '@/lib/dto/auth/SignUpRequestDto';

// 환경변수 확인
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase 환경변수가 설정되지 않았습니다. signup API가 비활성화됩니다.');
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

function validateBirth(birth: string) {
  // YYYY-MM-DD 형식 검증
  const birthRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!birthRegex.test(birth)) return false;
  
  const date = new Date(birth);
  const today = new Date();
  
  // 유효한 날짜인지 확인
  if (isNaN(date.getTime())) return false;
  
  // 미래 날짜는 불가능
  if (date > today) return false;
  
  // 너무 오래된 날짜는 불가능 (1900년 이전)
  if (date.getFullYear() < 1900) return false;
  
  return true;
}

export async function POST(req: Request) {
  // 환경변수가 없으면 에러 반환
  if (!supabase) {
    return NextResponse.json({ error: '서비스가 설정되지 않았습니다.' }, { status: 503 });
  }

  const body: SignUpRequestDto = await req.json();
  
  // 필수 필드 검증 (닉네임 제외)
  if (!body.email || !body.password || !body.name || !body.phone || !body.birth) {
    return NextResponse.json({ error: '필수 필드를 모두 입력해주세요.' }, { status: 400 });
  }
  
  // 생년월일 형식 검증
  if (!validateBirth(body.birth)) {
    return NextResponse.json({ error: '올바른 생년월일 형식을 입력해주세요. (예: 2003-01-11)' }, { status: 400 });
  }
  
  try {
    // 이메일 중복 체크
    const { data, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });
    if (data.users.some((u) => u.email === body.email.toLowerCase())) {
      return NextResponse.json({ error: '이미 가입된 이메일입니다.' }, { status: 409 });
    }
    
    // 회원가입
    const { data: userData, error: signUpError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      user_metadata: { 
        name: body.name, 
        nickname: body.nickname || '',
        phone: body.phone,
        birth: body.birth 
      }
    });
    
    if (signUpError) return NextResponse.json({ error: signUpError.message }, { status: 500 });

    // profiles 테이블에 추가 정보 저장
    const userId = userData?.user?.id;
    if (userId) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        email: body.email,
        name: body.name,
        nickname: body.nickname || null,
        phone: body.phone,
        birth: body.birth,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      if (profileError) {
        console.error('프로필 생성 오류:', profileError);
        return NextResponse.json({ error: profileError.message }, { status: 500 });
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('회원가입 중 오류:', error);
    return NextResponse.json({ error: '회원가입 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 