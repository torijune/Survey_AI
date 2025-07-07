import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId 누락' }, { status: 400 });

    // Supabase Auth 유저 삭제
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

    // profiles row도 삭제 (선택)
    await supabase.from('profiles').delete().eq('id', userId);

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: '계정 삭제 중 오류 발생' }, { status: 500 });
  }
} 