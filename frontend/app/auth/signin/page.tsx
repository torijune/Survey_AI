"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignInPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    console.log('로그인 시도:', { email: form.email, passwordLength: form.password.length });
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Supabase Anon Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password
      });

      console.log('로그인 결과:', { data, error });

      if (error) {
        console.error('로그인 에러:', error);
        setError(error.message || '로그인 실패');
        return;
      }

      console.log('로그인 성공:', data);
      setSuccess(true);
      setTimeout(() => router.push('/'), 1000);
    } catch (err) {
      console.error('로그인 중 예외 발생:', err);
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.push('/');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [success, router]);

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto mt-20 p-6 border rounded shadow space-y-4">
      <button type="button" onClick={() => router.push('/')} className="mb-2 text-sm text-gray-500 hover:underline">← 홈으로</button>
      <h1 className="text-2xl font-bold mb-4">로그인</h1>
      <input 
        name="email" 
        type="email"
        value={form.email} 
        onChange={handleChange} 
        placeholder="이메일" 
        className="w-full border p-2 rounded" 
        required
      />
      <input 
        name="password" 
        type="password" 
        value={form.password} 
        onChange={handleChange} 
        placeholder="비밀번호" 
        className="w-full border p-2 rounded" 
        required
      />
      <button 
        type="submit" 
        className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50" 
        disabled={loading}
      >
        {loading ? '로그인 중...' : '로그인'}
      </button>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {success && <div className="text-green-600 text-sm">로그인 성공!</div>}
      <div className="mt-4 text-center space-y-2">
        <a href="/auth/signup" className="text-blue-600 hover:underline block">회원가입</a>
        <a href="/auth/find-email" className="text-blue-600 hover:underline block">이메일 찾기</a>
        <a href="/auth/forgot-password" className="text-blue-600 hover:underline block">비밀번호 찾기</a>
      </div>
    </form>
  );
} 