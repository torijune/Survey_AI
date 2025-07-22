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
  Trash2,
  Download,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

const TEXT = {
  title: { "한국어": "FGI 주제 분석", "English": "FGI Subject Analysis" },
  back: { "한국어": "대시보드로 돌아가기", "English": "Back to Dashboard" },
  loading: { "한국어": "로딩 중...", "English": "Loading..." },
  error: { "한국어": "오류가 발생했습니다.", "English": "An error occurred." },
  not_found: { "한국어": "분석을 찾을 수 없습니다.", "English": "Analysis not found." },
  delete: { "한국어": "삭제", "English": "Delete" },
  confirm_delete: { "한국어": "정말 삭제하시겠습니까?", "English": "Are you sure you want to delete this?" },
  created: { "한국어": "생성일", "English": "Created" },
  title_label: { "한국어": "제목", "English": "Title" },
  description: { "한국어": "설명", "English": "Description" },
  guide_file: { "한국어": "가이드 파일", "English": "Guide File" },
  fgi_file: { "한국어": "FGI 파일", "English": "FGI File" },
  topics: { "한국어": "주제", "English": "Topics" },
  results: { "한국어": "분석 결과", "English": "Analysis Results" },
  topics_count: { "한국어": "주제 수", "English": "Topics Count" }
};

interface FGISubjectAnalysis {
  id: string;
  user_id: string;
  fgi_file_id: string;
  topics: any[];
  results: any;
  created_at: string;
  guide_file_name: string;
  title: string;
  fgi_file_name: string;
  description: string;
}

export default function FGISubjectAnalysisPage({ params }: { params: { id: string } }) {
  const { lang } = useLanguage();
  const { user, loading: authLoading } = useAuth('/dashboard');
  const [analysis, setAnalysis] = useState<FGISubjectAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const router = useRouter();
  const [openIndexes, setOpenIndexes] = useState<number[]>([]);
  const [parsedResults, setParsedResults] = useState<any[] | null>(null);

  useEffect(() => {
    const loadAnalysis = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('fgi_subject_analyses')
          .select('*')
          .eq('id', params.id)
          .eq('user_id', user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            setError(TEXT.not_found[lang]);
          } else {
            setError(TEXT.error[lang]);
          }
        } else {
          setAnalysis(data);
        }
      } catch (error) {
        console.error('분석 로드 오류:', error);
        setError(TEXT.error[lang]);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadAnalysis();
    }
  }, [user, params.id, lang]);

  // results 파싱 로직
  useEffect(() => {
    if (!analysis) return;
    let results = analysis.results;
    if (typeof results === 'string') {
      try {
        results = JSON.parse(results);
      } catch {
        results = null;
      }
    }
    if (Array.isArray(results)) {
      setParsedResults(results);
    } else {
      setParsedResults(null);
    }
  }, [analysis]);

  const handleDelete = async () => {
    if (!confirm(TEXT.confirm_delete[lang])) return;
    
    try {
      const { error } = await supabase
        .from('fgi_subject_analyses')
        .delete()
        .eq('id', params.id)
        .eq('user_id', user?.id);

      if (error) {
        throw new Error('삭제에 실패했습니다.');
      }

      router.push('/dashboard');
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

  if (authLoading || loading) {
    return (
      <div className="w-full max-w-screen-xl px-8 py-12 mx-auto">
        <div className="text-center">
          <p>{TEXT.loading[lang]}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-screen-xl px-8 py-12 mx-auto">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <Link href="/dashboard">
            <Button className="mt-4">{TEXT.back[lang]}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="w-full max-w-screen-xl px-8 py-12 mx-auto">
        <div className="text-center">
          <p>{TEXT.not_found[lang]}</p>
          <Link href="/dashboard">
            <Button className="mt-4">{TEXT.back[lang]}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-screen-xl px-8 py-12 mx-auto dark:bg-gray-900 dark:text-gray-100">
      <div className="flex items-center justify-between mb-6">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 flex items-center">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {TEXT.back[lang]}
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{TEXT.title[lang]}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDelete}
            className="text-red-600 hover:text-red-800"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {TEXT.delete[lang]}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 기본 정보 */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                {TEXT.title_label[lang]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">{TEXT.title_label[lang]}</p>
                <p className="text-lg font-semibold">{analysis.title || 'FGI 주제 분석'}</p>
              </div>
              
              {analysis.description && (
                <div>
                  <p className="text-sm font-medium text-gray-600">{TEXT.description[lang]}</p>
                  <p className="text-sm">{analysis.description}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-600">{TEXT.guide_file[lang]}</p>
                <p className="text-sm">{analysis.guide_file_name}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600">{TEXT.fgi_file[lang]}</p>
                <p className="text-sm">{analysis.fgi_file_name}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600">{TEXT.topics_count[lang]}</p>
                <p className="text-sm">{analysis.topics?.length || 0}개</p>
              </div>

              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="h-4 w-4 mr-2" />
                {formatDate(analysis.created_at)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 분석 결과 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                {TEXT.results[lang]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {parsedResults ? (
                <div className="space-y-6">
                  {parsedResults.map((item: any, idx: number) => {
                    const isOpen = openIndexes.includes(idx);
                    const resultText = item.result || '';
                    const shortResult = resultText.length > 120 ? resultText.slice(0, 120) + '...' : resultText;
                    return (
                      <Card key={idx} className="border border-gray-200 dark:border-gray-700">
                        <CardHeader className="flex flex-row items-center justify-between cursor-pointer select-none" onClick={() => {
                          setOpenIndexes(isOpen ? openIndexes.filter(i => i !== idx) : [...openIndexes, idx]);
                        }}>
                          <div className="flex-1">
                            <div className="font-bold text-base mb-1">{item.topic}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {isOpen ? null : shortResult}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="ml-2">
                            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </Button>
                        </CardHeader>
                        {isOpen && (
                          <CardContent className="pt-0 pb-4">
                            <div className="prose dark:prose-invert max-w-none">
                              <ReactMarkdown>{resultText}</ReactMarkdown>
                            </div>
                            {item.context_chunks && Array.isArray(item.context_chunks) && item.context_chunks.length > 0 && (
                              <div className="mt-4">
                                <div className="font-semibold mb-2">Context</div>
                                <div className="space-y-2">
                                  {item.context_chunks.map((chunk: string, cidx: number) => (
                                    <div key={cidx} className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs">
                                      <ReactMarkdown>{chunk}</ReactMarkdown>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {typeof analysis.results === 'object' ? (
                    <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
                      {JSON.stringify(analysis.results, null, 2)}
                    </pre>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p>{analysis.results}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 주제 목록 */}
          {analysis.topics && analysis.topics.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{TEXT.topics[lang]}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysis.topics.map((topic, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <p className="font-medium">{topic}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 