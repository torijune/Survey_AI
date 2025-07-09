"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!ignore) {
        setUser(data.user);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      ignore = true;
      listener?.subscription.unsubscribe();
    };
  }, []);

  // 프로필 정보 가져오기
  useEffect(() => {
    if (user?.id) {
      supabase.from("profiles").select("name").eq("id", user.id).single().then(({ data, error }) => {
        if (error && error.code !== 'PGRST116') {
          console.error('프로필 조회 오류:', error);
        }
        setProfile(data);
      });
    } else {
      setProfile(null);
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  };

  const getUserDisplayName = () => {
    if (profile?.name) return profile.name;
    if (user?.user_metadata?.name) return user.user_metadata.name;
    if (user?.email) return user.email;
    return '사용자';
  };

  return (
    <header className="w-full bg-white border-b shadow-sm py-3 px-6 flex items-center justify-between dark:bg-gray-900 dark:border-gray-800">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-bold text-lg hover:text-blue-600 transition-colors dark:text-gray-100">
          My App
        </Link>
        {user && (
          <nav className="flex items-center gap-4">
                        <Link 
              href="/survey" 
              className="text-gray-600 hover:text-blue-600 transition-colors text-sm dark:text-gray-200 dark:hover:text-blue-400"
            >
              설문 계획
            </Link>
            <Link 
              href="/table-analysis" 
              className="text-gray-600 hover:text-blue-600 transition-colors text-sm dark:text-gray-200 dark:hover:text-blue-400"
            >
              설문 분석
            </Link>
            <Link 
              href="/table-visualization" 
              className="text-gray-600 hover:text-blue-600 transition-colors text-sm dark:text-gray-200 dark:hover:text-blue-400"
            >
              시각화
            </Link>
            <Link 
              href="/FGI-analysis" 
              className="text-gray-600 hover:text-blue-600 transition-colors text-sm dark:text-gray-200 dark:hover:text-blue-400"
            >
              FGI 분석
            </Link>
            <Link 
              href="/dashboard" 
              className="text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium dark:text-gray-200 dark:hover:text-blue-400"
            >
              대시보드
            </Link>
          </nav>
        )}
      </div>
      <div className="flex items-center gap-4">
        {loading ? null : user ? (
          <>
            <span className="text-sm text-gray-600 dark:text-gray-200">
              안녕하세요, {getUserDisplayName()}님
            </span>
            <Link 
              href="/profile" 
              className="text-blue-600 hover:text-blue-700 hover:underline text-sm dark:text-blue-400 dark:hover:text-blue-300"
            >
              마이 페이지
            </Link>
            <button 
              onClick={handleLogout} 
              className="text-red-600 hover:text-red-700 hover:underline text-sm dark:text-red-400 dark:hover:text-red-300"
            >
              로그아웃
            </button>
          </>
        ) : (
          <Link href="/auth/signin" className="text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300">
            로그인
          </Link>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
} 