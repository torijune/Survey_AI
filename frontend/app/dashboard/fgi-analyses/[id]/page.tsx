"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/components/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, 
  Calendar, 
  FileText, 
  Users, 
  Mic, 
  FileAudio,
  Trash2,
  Download
} from "lucide-react";
import ReactMarkdown from 'react-markdown';

const TEXT = {
  back_to_dashboard: { "한국어": "대시보드로", "English": "Back to Dashboard" },
  title: { "한국어": "FGI 분석 결과", "English": "FGI Analysis Result" },
  loading: { "한국어": "로딩 중...", "English": "Loading..." },
  error: { "한국어": "오류가 발생했습니다.", "English": "An error occurred." },
  not_found: { "한국어": "분석 결과를 찾을 수 없습니다.", "English": "Analysis result not found." },
  delete: { "한국어": "삭제", "English": "Delete" },
  confirm_delete: { "한국어": "정말 삭제하시겠습니까?", "English": "Are you sure you want to delete this?" },
  created: { "한국어": "생성일", "English": "Created" },
  description: { "한국어": "설명", "English": "Description" },
  summary: { "한국어": "분석 요약", "English": "Analysis Summary" },
  chunk_summaries: { "한국어": "청크별 요약", "English": "Chunk Summaries" },
  file_info: { "한국어": "파일 정보", "English": "File Information" },
  audio_files: { "한국어": "음성 파일", "English": "Audio Files" },
  doc_files: { "한국어": "문서 파일", "English": "Document Files" },
  guide_file: { "한국어": "가이드라인 파일", "English": "Guide File" },
  show_chunks: { "한국어": "청크별 요약 보기", "English": "Show Chunk Summaries" },
  hide_chunks: { "한국어": "청크별 요약 숨기기", "English": "Hide Chunk Summaries" }
};

interface FGIAnalysis {
  id: string;
  title: string;
  description?: string;
  audio_files_count: number;
  doc_files_count: number;
  guide_file_name?: string;
  created_at: string;
  summary_result: {
    summary?: string;
    chunk_summaries?: string[];
  };
}

export default function FGIAnalysisDetailPage({ params }: { params: { id: string } }) {
  const { lang } = useLanguage();
  const { user, loading: authLoading } = useAuth('/dashboard');
  const [analysis, setAnalysis] = useState<FGIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [showChunks, setShowChunks] = useState(false);

  useEffect(() => {
    const loadAnalysis = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('세션이 만료되었습니다.');
        }

        const response = await fetch(`/api/fgi-analyses/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(TEXT.not_found[lang]);
          }
          throw new Error('분석 결과를 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        setAnalysis(data.data);
      } catch (error) {
        console.error('분석 결과 로드 오류:', error);
        setError(error instanceof Error ? error.message : TEXT.error[lang]);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadAnalysis();
    }
  }, [user, params.id, lang]);

  const handleDelete = async () => {
    if (!confirm(TEXT.confirm_delete[lang])) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('세션이 만료되었습니다.');
      }

      const response = await fetch(`/api/fgi-analyses/${params.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        // 대시보드로 리다이렉트
        window.location.href = '/dashboard';
      } else {
        throw new Error('삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('삭제 오류:', error);
      setError(error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(lang === "한국어" ? "ko-KR" : "en-US", {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (authLoading) {
    return (
      <div className="w-full max-w-screen-xl px-8 py-12 mx-auto dark:bg-gray-900 dark:text-gray-100">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">인증 확인 중...</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-screen-xl px-8 py-12 mx-auto dark:bg-gray-900 dark:text-gray-100">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">{TEXT.loading[lang]}</span>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="w-full max-w-screen-xl px-8 py-12 mx-auto dark:bg-gray-900 dark:text-gray-100">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">← {TEXT.back_to_dashboard[lang]}</Link>
        <LanguageSwitcher />
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{TEXT.error[lang]}</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-screen-xl px-8 py-12 mx-auto dark:bg-gray-900 dark:text-gray-100">
      <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">← {TEXT.back_to_dashboard[lang]}</Link>
      <LanguageSwitcher />
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{TEXT.title[lang]}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-800">
            <Trash2 className="h-4 w-4 mr-2" />
            {TEXT.delete[lang]}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 메인 콘텐츠 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 분석 요약 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                {TEXT.summary[lang]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown>
                  {analysis.summary_result?.summary || '분석 요약이 없습니다.'}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {/* 청크별 요약 */}
          {analysis.summary_result?.chunk_summaries && analysis.summary_result.chunk_summaries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    {TEXT.chunk_summaries[lang]}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowChunks(!showChunks)}
                  >
                    {showChunks ? TEXT.hide_chunks[lang] : TEXT.show_chunks[lang]}
                  </Button>
                </CardTitle>
              </CardHeader>
              {showChunks && (
                <CardContent>
                  <div className="space-y-4">
                    {analysis.summary_result.chunk_summaries.map((chunk, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg dark:bg-gray-800">
                        <h4 className="font-medium mb-2">청크 {index + 1}</h4>
                        <div className="prose dark:prose-invert max-w-none text-sm">
                          <ReactMarkdown>
                            {chunk}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>

        {/* 사이드바 */}
        <div className="space-y-6">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                {analysis.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analysis.description && (
                <div>
                  <p className="text-sm font-medium text-gray-600">{TEXT.description[lang]}</p>
                  <p className="text-sm text-gray-800">{analysis.description}</p>
                </div>
              )}
              
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="h-4 w-4 mr-2" />
                {formatDate(analysis.created_at)}
              </div>
            </CardContent>
          </Card>

          {/* 파일 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                {TEXT.file_info[lang]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.audio_files_count > 0 && (
                <div className="flex items-center">
                  <Mic className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="text-sm">
                    {TEXT.audio_files[lang]}: {analysis.audio_files_count}개
                  </span>
                </div>
              )}
              
              {analysis.doc_files_count > 0 && (
                <div className="flex items-center">
                  <FileAudio className="h-4 w-4 mr-2 text-green-500" />
                  <span className="text-sm">
                    {TEXT.doc_files[lang]}: {analysis.doc_files_count}개
                  </span>
                </div>
              )}
              
              {analysis.guide_file_name && (
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-orange-500" />
                  <span className="text-sm">
                    {TEXT.guide_file[lang]}: {analysis.guide_file_name}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 