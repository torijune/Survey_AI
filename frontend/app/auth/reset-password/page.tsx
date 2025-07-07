"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // 현재 세션 확인
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('비밀번호 재설정 링크가 유효하지 않습니다.');
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 비밀번호 확인
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setLoading(false);
      return;
    }

    // 비밀번호 길이 확인
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
      // 3초 후 로그인 페이지로 이동
      setTimeout(() => {
        router.push('/auth/signin');
      }, 3000);
    } catch (err) {
      setError('비밀번호 재설정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (error && !success) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 border rounded shadow space-y-4">
        <button type="button" onClick={() => router.push('/')} className="mb-2 text-sm text-gray-500 hover:underline">← 홈으로</button>
        <h1 className="text-2xl font-bold mb-4">비밀번호 재설정</h1>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
        <div className="text-center">
          <a href="/auth/forgot-password" className="text-blue-600 hover:underline">비밀번호 찾기</a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded shadow space-y-4">
      <button type="button" onClick={() => router.push('/')} className="mb-2 text-sm text-gray-500 hover:underline">← 홈으로</button>
      <h1 className="text-2xl font-bold mb-4">비밀번호 재설정</h1>
      
      {!success ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="새 비밀번호"
            className="w-full border p-2 rounded"
            required
            minLength={6}
          />
          <input
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="새 비밀번호 확인"
            className="w-full border p-2 rounded"
            required
            minLength={6}
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50"
            disabled={loading}
          >
            {loading ? '재설정 중...' : '비밀번호 재설정'}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-600 text-sm">
              비밀번호가 성공적으로 재설정되었습니다.
            </p>
            <p className="text-green-800 text-sm mt-2">
              3초 후 로그인 페이지로 이동합니다.
            </p>
          </div>
        </div>
      )}

      {error && <div className="text-red-500 text-sm">{error}</div>}
      
      <div className="mt-4 text-center">
        <a href="/auth/signin" className="text-blue-600 hover:underline">로그인</a>
      </div>
    </div>
  );
} 