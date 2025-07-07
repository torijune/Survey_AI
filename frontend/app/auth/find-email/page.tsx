"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FindEmailPage() {
  const [form, setForm] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ maskedEmail: string; message: string } | null>(null);
  const router = useRouter();

  // 전화번호 포맷팅 함수
  const formatPhoneNumber = (value: string) => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, '');
    
    // 길이에 따라 하이픈 추가
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      // 전화번호는 11자리까지만 입력 가능
      const numbers = value.replace(/[^\d]/g, '');
      if (numbers.length <= 11) {
        setForm({ ...form, [name]: formatPhoneNumber(value) });
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/auth/find-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '이메일 찾기에 실패했습니다.');
        return;
      }

      setResult(data);
    } catch (err) {
      setError('이메일 찾기 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded shadow space-y-4">
      <button type="button" onClick={() => router.push('/')} className="mb-2 text-sm text-gray-500 hover:underline">← 홈으로</button>
      <h1 className="text-2xl font-bold mb-4">이메일 찾기</h1>
      
      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            placeholder="이름"
            className="w-full border p-2 rounded"
            required
          />
          <input
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            placeholder="전화번호 (010-1234-5678)"
            className="w-full border p-2 rounded"
            required
            maxLength={13}
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50"
            disabled={loading}
          >
            {loading ? '찾는 중...' : '이메일 찾기'}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-600 text-sm">{result.message}</p>
            <p className="text-green-800 font-semibold mt-2">{result.maskedEmail}</p>
          </div>
          <button
            onClick={() => {
              setResult(null);
              setForm({ name: '', phone: '' });
            }}
            className="w-full bg-gray-600 text-white p-2 rounded"
          >
            다시 찾기
          </button>
        </div>
      )}

      {error && <div className="text-red-500 text-sm">{error}</div>}
      
      <div className="mt-4 text-center space-y-2">
        <a href="/auth/signin" className="text-blue-600 hover:underline block">로그인</a>
        <a href="/auth/forgot-password" className="text-blue-600 hover:underline block">비밀번호 찾기</a>
      </div>
    </div>
  );
} 