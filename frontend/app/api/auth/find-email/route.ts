import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { name, phone } = await req.json();
    
    if (!name || !phone) {
      return NextResponse.json({ error: '이름과 전화번호를 모두 입력해주세요.' }, { status: 400 });
    }

    // profiles 테이블에서 이름과 전화번호로 이메일 찾기
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('name', name)
      .eq('phone', phone)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '일치하는 정보를 찾을 수 없습니다.' }, { status: 404 });
      }
      console.error('이메일 찾기 오류:', error);
      return NextResponse.json({ error: '이메일 찾기 중 오류가 발생했습니다.' }, { status: 500 });
    }

    if (!data || !data.email) {
      return NextResponse.json({ error: '일치하는 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 이메일 주소의 일부를 가려서 반환 (보안상)
    const email = data.email;
    const [localPart, domain] = email.split('@');
    const maskedEmail = `${localPart.substring(0, 2)}***@${domain}`;

    return NextResponse.json({ 
      success: true, 
      maskedEmail,
      message: '이메일을 찾았습니다.' 
    });
  } catch (error) {
    console.error('이메일 찾기 중 오류:', error);
    return NextResponse.json({ error: '이메일 찾기 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 