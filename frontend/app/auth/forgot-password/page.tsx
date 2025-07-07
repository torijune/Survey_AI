"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '비밀번호 재설정 이메일 발송에 실패했습니다.');
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('비밀번호 재설정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded shadow space-y-4">
      <button type="button" onClick={() => router.push('/')} className="mb-2 text-sm text-gray-500 hover:underline">← 홈으로</button>
      <h1 className="text-2xl font-bold mb-4">비밀번호 찾기</h1>
      
      {!success ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-gray-600 text-sm mb-4">
            가입한 이메일 주소를 입력하시면, 비밀번호 재설정 링크를 보내드립니다.
          </p>
          <input
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소"
            className="w-full border p-2 rounded"
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50"
            disabled={loading}
          >
            {loading ? '발송 중...' : '비밀번호 재설정 이메일 발송'}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-600 text-sm">
              비밀번호 재설정 이메일이 발송되었습니다.
            </p>
            <p className="text-green-800 text-sm mt-2">
              이메일을 확인하여 비밀번호를 재설정해주세요.
            </p>
          </div>
          <button
            onClick={() => {
              setSuccess(false);
              setEmail('');
            }}
            className="w-full bg-gray-600 text-white p-2 rounded"
          >
            다시 발송
          </button>
        </div>
      )}

      {error && <div className="text-red-500 text-sm">{error}</div>}
      
      <div className="mt-4 text-center space-y-2">
        <a href="/auth/signin" className="text-blue-600 hover:underline block">로그인</a>
        <a href="/auth/find-email" className="text-blue-600 hover:underline block">이메일 찾기</a>
      </div>
    </div>
  );
} 