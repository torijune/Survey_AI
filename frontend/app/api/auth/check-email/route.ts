import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: '이메일이 올바르지 않습니다.' }, { status: 400 });
  }
  const { data, error } = await supabase.auth.admin.listUsers();
  console.log('check-email:', { email, data, error });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const exists = data?.users?.some((u) => u.email === email.toLowerCase());
  return NextResponse.json({ exists });
} 