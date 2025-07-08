"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/components/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, Calendar, Copy, FileText } from "lucide-react";

const TEXT = {
  title: { "한국어": "저장한 Q&A 상세", "English": "Saved Q&A Detail" },
  back: { "한국어": "대시보드로 돌아가기", "English": "Back to Dashboard" },
  file_name: { "한국어": "파일명", "English": "File Name" },
  created_at: { "한국어": "저장일", "English": "Saved At" },
  question: { "한국어": "질문", "English": "Question" },
  answer: { "한국어": "답변", "English": "Answer" },
  description: { "한국어": "설명", "English": "Description" },
  loading: { "한국어": "로딩 중...", "English": "Loading..." },
  error: { "한국어": "오류가 발생했습니다.", "English": "An error occurred." },
  not_found: { "한국어": "Q&A를 찾을 수 없습니다.", "English": "Q&A not found." },
  copy: { "한국어": "복사", "English": "Copy" },
  copied: { "한국어": "복사됨!", "English": "Copied!" },
};

export default function FavoriteQADetailPage({ params }: { params: { id: string } }) {
  const { lang } = useLanguage();
  const { user, loading: authLoading } = useAuth('/dashboard');
  const [favorite, setFavorite] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const loadFavorite = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('세션이 만료되었습니다.');
      }
      const { data, error } = await supabase
        .from('fgi_rag_favorites')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single();
      if (error || !data) {
        throw new Error(TEXT.not_found[lang]);
      }
      setFavorite(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : TEXT.error[lang]);
    } finally {
      setLoading(false);
    }
  }, [user, params.id, lang]);

  useEffect(() => {
    if (user && params.id) {
      loadFavorite();
    }
  }, [user, params.id, loadFavorite]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(lang === "한국어" ? "ko-KR" : "en-US", {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(text);
    setTimeout(() => setCopySuccess(null), 1500);
  };

  if (authLoading) {
    return (
      <div className="w-full max-w-screen-xl px-8 py-12 mx-auto">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">인증 확인 중...</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-screen-xl px-8 py-12 mx-auto">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">{TEXT.loading[lang]}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-screen-xl px-8 py-12 mx-auto">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          <ArrowLeft className="inline-block mr-1" /> {TEXT.back[lang]}
        </Link>
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-screen-md px-4 py-10 mx-auto dark:bg-gray-900 dark:text-gray-100">
      <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
        <ArrowLeft className="inline-block mr-1" /> {TEXT.back[lang]}
      </Link>
      <LanguageSwitcher />
      <h1 className="text-2xl font-bold mb-6">{TEXT.title[lang]}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" /> {favorite.title || 'Q&A'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {favorite.description && (
            <div>
              <p className="text-sm font-medium text-gray-600">{TEXT.description[lang]}</p>
              <p className="text-sm text-gray-800 whitespace-pre-line">{favorite.description}</p>
            </div>
          )}
          {favorite.file_name && (
            <div>
              <p className="text-sm font-medium text-gray-600">{TEXT.file_name[lang]}</p>
              <p className="text-sm text-gray-800">{favorite.file_name}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-600">{TEXT.created_at[lang]}</p>
            <p className="text-sm text-gray-800">{formatDate(favorite.created_at)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{TEXT.question[lang]}</p>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base font-semibold text-gray-900 break-words flex-1">{favorite.question}</span>
              <button title={TEXT.copy[lang]} onClick={() => handleCopy(favorite.question)} className="p-1 rounded hover:bg-blue-100">
                <Copy className="w-4 h-4 text-blue-500" />
              </button>
              {copySuccess === favorite.question && <span className="text-xs text-green-600 ml-1">{TEXT.copied[lang]}</span>}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{TEXT.answer[lang]}</p>
            <div className={`relative ${!expanded && favorite.answer.length > 500 ? 'line-clamp-8' : ''} bg-gray-50 p-3 rounded-md`}>
              <span className="text-base text-gray-900 whitespace-pre-line break-words">{favorite.answer}</span>
              <button title={TEXT.copy[lang]} onClick={() => handleCopy(favorite.answer)} className="absolute top-2 right-2 p-1 rounded hover:bg-blue-100">
                <Copy className="w-4 h-4 text-blue-500" />
              </button>
              {copySuccess === favorite.answer && <span className="text-xs text-green-600 ml-1">{TEXT.copied[lang]}</span>}
            </div>
            {favorite.answer.length > 500 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(e => !e)}
                className="mt-2 text-blue-600 hover:text-blue-800"
              >
                {expanded ? '접기' : '더보기'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 