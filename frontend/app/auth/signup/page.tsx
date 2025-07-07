"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignUpPage() {
  const [form, setForm] = useState({ 
    email: '', 
    password: '', 
    name: '', 
    nickname: '', 
    phone: '', 
    birth: '' 
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // 실시간 이메일 중복 체크 상태
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'exists' | 'not-exists' | 'invalid' | 'error'>('idle');
  const [emailMessage, setEmailMessage] = useState('');
  const debounceRef = useRef<NodeJS.Timeout>();

  const router = useRouter();

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.push('/auth/signin');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [success, router]);

  function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePhone(phone: string) {
    // 한국 전화번호 형식: 010-1234-5678 또는 01012345678
    return /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(phone);
  }

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

  // 전화번호 하이픈 자동 포맷 함수
  function formatPhoneNumber(value: string) {
    const numbers = value.replace(/[^0-9]/g, "");
    if (numbers.length < 4) return numbers;
    if (numbers.length < 8) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  }

  // 생년월일 하이픈 자동 포맷 함수
  function formatBirth(value: string) {
    const numbers = value.replace(/[^0-9]/g, "");
    if (numbers.length < 5) return numbers;
    if (numbers.length < 7) return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
    return `${numbers.slice(0, 4)}-${numbers.slice(4, 6)}-${numbers.slice(6, 8)}`;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "phone") {
      setForm({ ...form, phone: formatPhoneNumber(value) });
    } else if (name === "birth") {
      setForm({ ...form, birth: formatBirth(value) });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm({ ...form, email: value });
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value) {
      setEmailStatus('idle');
      setEmailMessage('');
      return;
    }
    if (!validateEmail(value)) {
      setEmailStatus('invalid');
      setEmailMessage('올바른 이메일 형식이 아닙니다.');
      return;
    }
    setEmailStatus('checking');
    setEmailMessage('중복 확인 중...');
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: value }),
        });
        const data = await res.json();
        if (data.error) {
          setEmailStatus('error');
          setEmailMessage('이메일 중복 확인 중 오류가 발생했습니다.');
          return;
        }
        if (data.exists) {
          setEmailStatus('exists');
          setEmailMessage('이미 가입된 이메일입니다.');
        } else {
          setEmailStatus('not-exists');
          setEmailMessage('사용 가능한 이메일입니다.');
        }
      } catch {
        setEmailStatus('error');
        setEmailMessage('이메일 중복 확인 중 오류가 발생했습니다.');
      }
    }, 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    // 필수 필드 검증 (닉네임 제외)
    if (!form.email || !form.password || !form.name || !form.phone || !form.birth) {
      setError('필수 필드를 모두 입력해주세요.');
      setLoading(false);
      return;
    }

    // 전화번호 형식 검증
    if (!validatePhone(form.phone)) {
      setError('올바른 전화번호 형식을 입력해주세요. (예: 010-1234-5678)');
      setLoading(false);
      return;
    }

    // 생년월일 형식 검증
    if (!validateBirth(form.birth)) {
      setError('올바른 생년월일 형식을 입력해주세요. (예: YYYY-MM-DD)');
      setLoading(false);
      return;
    }

    console.log('회원가입 시도:', { 
      email: form.email, 
      passwordLength: form.password.length,
      name: form.name,
      nickname: form.nickname,
      phone: form.phone,
      birth: form.birth
    });

    try {
      // API를 통한 회원가입 (profiles 테이블에 자동 생성)
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      console.log('회원가입 API 응답:', data);

      if (!res.ok) {
        setError(data.error || '회원가입 실패');
        return;
      }

      console.log('회원가입 성공');
      setSuccess(true);
      setTimeout(() => router.push('/auth/signin'), 1000);
    } catch (err) {
      console.error('회원가입 중 예외 발생:', err);
      setError('회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto mt-20 p-6 border rounded shadow space-y-4">
      <button type="button" onClick={() => router.back()} className="mb-2 text-sm text-gray-500 hover:underline">← 뒤로가기</button>
      <h1 className="text-2xl font-bold mb-4">회원가입</h1>
      
      <input 
        name="email" 
        type="email"
        value={form.email} 
        onChange={handleEmailChange} 
        placeholder="이메일 *" 
        className="w-full border p-2 rounded" 
        required
      />
      {emailMessage && (
        <div className={`text-sm mt-1 ${
          emailStatus === 'exists' ? 'text-red-500' :
          emailStatus === 'not-exists' ? 'text-green-600' :
          emailStatus === 'invalid' || emailStatus === 'error' ? 'text-red-400' :
          emailStatus === 'checking' ? 'text-gray-500' : ''
        }`}>{emailMessage}</div>
      )}
      
      <input 
        name="password" 
        type="password" 
        value={form.password} 
        onChange={handleChange} 
        placeholder="비밀번호 *" 
        className="w-full border p-2 rounded" 
        required
        minLength={6}
      />
      
      <input 
        name="name" 
        value={form.name} 
        onChange={handleChange} 
        placeholder="이름 *" 
        className="w-full border p-2 rounded" 
        required
      />
      
      <input 
        name="nickname" 
        value={form.nickname} 
        onChange={handleChange} 
        placeholder="닉네임 (선택사항)" 
        className="w-full border p-2 rounded" 
      />
      
      <input 
        name="phone" 
        type="tel"
        value={form.phone} 
        onChange={handleChange} 
        placeholder="전화번호 * (010-1234-5678)" 
        className="w-full border p-2 rounded" 
        required
      />
      
      <input 
        name="birth" 
        type="text"
        value={form.birth} 
        onChange={handleChange} 
        placeholder="생년월일 * (2003-01-11)" 
        className="w-full border p-2 rounded" 
        required
        pattern="\d{4}-\d{2}-\d{2}"
        title="YYYY-MM-DD 형식으로 입력해주세요"
      />
      
      <button 
        type="submit" 
        className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50" 
        disabled={loading || emailStatus === 'exists'}
      >
        {loading ? '회원가입 중...' : '회원가입'}
      </button>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {success && <div className="text-green-600 text-sm">회원가입 성공!</div>}
    </form>
  );
} 