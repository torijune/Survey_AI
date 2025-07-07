"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/components/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Calendar, FileText, ChevronDown, ChevronUp } from "lucide-react";

const TEXT = {
  title: { "한국어": "설문 계획 상세", "English": "Survey Plan Detail" },
  back: { "한국어": "대시보드로 돌아가기", "English": "Back to Dashboard" },
  topic: { "한국어": "주제", "English": "Topic" },
  objective: { "한국어": "목적", "English": "Objective" },
  generated_objective: { "한국어": "생성된 목적", "English": "Generated Objective" },
  generated_audience: { "한국어": "타겟 응답자", "English": "Target Audience" },
  generated_structure: { "한국어": "설문 구조", "English": "Survey Structure" },
  generated_questions: { "한국어": "예시 문항", "English": "Sample Questions" },
  validation_checklist: { "한국어": "설문 검증 체크리스트", "English": "Validation Checklist" },
  created_at: { "한국어": "생성일", "English": "Created At" },
  loading: { "한국어": "로딩 중...", "English": "Loading..." },
  error: { "한국어": "오류가 발생했습니다.", "English": "An error occurred." },
  not_found: { "한국어": "설문 계획을 찾을 수 없습니다.", "English": "Survey plan not found." },
  show_more: { "한국어": "더보기", "English": "Show More" },
  show_less: { "한국어": "접기", "English": "Show Less" }
};

interface SurveyPlan {
  id: string;
  topic: string;
  objective?: string;
  created_at: string;
  generated_objective?: string;
  generated_audience?: string;
  generated_structure?: string;
  generated_questions?: string;
  validation_checklist?: string;
}

export default function SurveyPlanDetailPage({ params }: { params: { id: string } }) {
  const { lang } = useLanguage();
  const { user, loading: authLoading } = useAuth('/dashboard');
  const [plan, setPlan] = useState<SurveyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});

  const loadPlan = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('세션이 만료되었습니다.');
      }

      const response = await fetch(`/api/survey-plans/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(TEXT.not_found[lang]);
        }
        throw new Error('데이터를 불러올 수 없습니다.');
      }

      const data = await response.json();
      setPlan(data.data);
    } catch (error) {
      console.error('설문 계획 로드 오류:', error);
      setError(error instanceof Error ? error.message : TEXT.error[lang]);
    } finally {
      setLoading(false);
    }
  }, [user, params.id, lang]);

  useEffect(() => {
    if (user && params.id) {
      loadPlan();
    }
  }, [user, params.id, loadPlan]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(lang === "한국어" ? "ko-KR" : "en-US", {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const renderExpandableContent = (content: string, sectionKey: string, title: string) => {
    const isExpanded = expandedSections[sectionKey];
    const shouldShowExpand = content.length > 300;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`prose prose-sm max-w-none ${!isExpanded && shouldShowExpand ? 'line-clamp-6' : ''}`}>
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
          {shouldShowExpand && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection(sectionKey)}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  {TEXT.show_less[lang]}
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  {TEXT.show_more[lang]}
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
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
          <ArrowLeft className="inline h-4 w-4 mr-1" />
          {TEXT.back[lang]}
        </Link>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="w-full max-w-screen-xl px-8 py-12 mx-auto">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          <ArrowLeft className="inline h-4 w-4 mr-1" />
          {TEXT.back[lang]}
        </Link>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">{TEXT.not_found[lang]}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-screen-xl px-8 py-12 mx-auto">
      <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
        <ArrowLeft className="inline h-4 w-4 mr-1" />
        {TEXT.back[lang]}
      </Link>
      <LanguageSwitcher />
      <h1 className="text-2xl font-bold mb-4">{TEXT.title[lang]}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 기본 정보 - 작은 사이드바 */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-gray-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <FileText className="mr-2 h-4 w-4" />
                {TEXT.topic[lang]}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm font-medium">{plan.topic}</p>
            </CardContent>
          </Card>

          {plan.objective && (
            <Card className="bg-gray-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">{TEXT.objective[lang]}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-700">{plan.objective}</p>
              </CardContent>
            </Card>
          )}

          <Card className="bg-gray-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                {TEXT.created_at[lang]}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-gray-600">{formatDate(plan.created_at)}</p>
            </CardContent>
          </Card>
        </div>

        {/* 생성된 결과들 - 큰 메인 영역 */}
        <div className="lg:col-span-3 space-y-6">
          {plan.generated_objective && renderExpandableContent(
            plan.generated_objective, 
            'objective', 
            TEXT.generated_objective[lang]
          )}

          {plan.generated_audience && renderExpandableContent(
            plan.generated_audience, 
            'audience', 
            TEXT.generated_audience[lang]
          )}

          {plan.generated_structure && renderExpandableContent(
            plan.generated_structure, 
            'structure', 
            TEXT.generated_structure[lang]
          )}

          {plan.generated_questions && renderExpandableContent(
            plan.generated_questions, 
            'questions', 
            TEXT.generated_questions[lang]
          )}

          {plan.validation_checklist && renderExpandableContent(
            plan.validation_checklist, 
            'checklist', 
            TEXT.validation_checklist[lang]
          )}
        </div>
      </div>
    </div>
  );
} 