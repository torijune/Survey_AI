"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from '@/lib/hooks/useAuth';
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  FileText, 
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react";
import { useParams } from 'next/navigation';

const TEXT = {
  title: { "한국어": "FGI 그룹 비교 분석", "English": "FGI Group Comparison Analysis" },
  back: { "한국어": "대시보드로 돌아가기", "English": "Back to Dashboard" },
  loading: { "한국어": "로딩 중...", "English": "Loading..." },
  error: { "한국어": "오류가 발생했습니다.", "English": "An error occurred." },
  not_found: { "한국어": "분석 결과를 찾을 수 없습니다.", "English": "Analysis result not found." },
  guide_file: { "한국어": "가이드 파일", "English": "Guide File" },
  compared_groups: { "한국어": "비교 그룹", "English": "Compared Groups" },
  total_topics: { "한국어": "총 주제 수", "English": "Total Topics" },
  analysis_status: { "한국어": "분석 상태", "English": "Analysis Status" },
  created_at: { "한국어": "생성일", "English": "Created At" },
  overall_summary: { "한국어": "전체 비교 요약", "English": "Overall Comparison Summary" },
  recommendations: { "한국어": "종합 권장사항", "English": "Recommendations" },
  topic_analysis: { "한국어": "주제별 분석", "English": "Topic Analysis" },
  common_points: { "한국어": "공통점", "English": "Common Points" },
  differences: { "한국어": "차이점", "English": "Differences" },
  insights: { "한국어": "주요 인사이트", "English": "Key Insights" },
  topic: { "한국어": "주제", "English": "Topic" }
};

interface GroupComparisonTopic {
  id: string;
  comparison_id: string;
  topic_name: string;
  topic_order: number;
  common_points: string;
  differences: string;
  insights: string;
  created_at: string;
}

interface GroupComparisonDetail {
  comparison: {
    id: string;
    user_id: string;
    guide_file_name: string;
    group_names: string[];
    summary: string;
    recommendations: string;
    total_topics: number;
    analysis_status: string;
    created_at: string;
    updated_at: string;
  };
  topics: GroupComparisonTopic[];
}

export default function GroupComparisonDetailPage() {
  const { lang } = useLanguage();
  const { user, loading: authLoading } = useAuth('/dashboard');
  const params = useParams();
  const comparisonId = params.id as string;
  
  const [comparison, setComparison] = useState<GroupComparisonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const loadComparisonDetail = async () => {
      if (!user || !comparisonId) return;
      
      setLoading(true);
      try {
        const { data: { session } } = await fetch('/api/auth/session').then(res => res.json());
        if (!session) {
          throw new Error('세션이 만료되었습니다.');
        }

        const response = await fetch(`/api/fgi_group_analysis?comparison_id=${comparisonId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(TEXT.not_found[lang]);
          }
          throw new Error(TEXT.error[lang]);
        }

        const data = await response.json();
        setComparison(data);
      } catch (error) {
        console.error('Error loading comparison detail:', error);
        setError(error instanceof Error ? error.message : TEXT.error[lang]);
      } finally {
        setLoading(false);
      }
    };

    loadComparisonDetail();
  }, [user, comparisonId, lang]);

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

  if (error) {
    return (
      <div className="w-full max-w-screen-xl px-8 py-12 mx-auto dark:bg-gray-900 dark:text-gray-100">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{TEXT.error[lang]}</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/dashboard">
            <Button>{TEXT.back[lang]}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="w-full max-w-screen-xl px-8 py-12 mx-auto dark:bg-gray-900 dark:text-gray-100">
        <div className="text-center">
          <Info className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{TEXT.not_found[lang]}</h2>
          <Link href="/dashboard">
            <Button>{TEXT.back[lang]}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-screen-xl px-8 py-12 mx-auto dark:bg-gray-900 dark:text-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {TEXT.back[lang]}
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{TEXT.title[lang]}</h1>
        </div>
        <LanguageSwitcher />
      </div>

      {/* 메타데이터 카드 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            분석 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">{TEXT.guide_file[lang]}</p>
              <p className="text-sm">{comparison.comparison.guide_file_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">{TEXT.compared_groups[lang]}</p>
              <p className="text-sm">{comparison.comparison.group_names.join(', ')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">{TEXT.total_topics[lang]}</p>
              <p className="text-sm">{comparison.comparison.total_topics}개</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">{TEXT.created_at[lang]}</p>
              <p className="text-sm">{formatDate(comparison.comparison.created_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 전체 비교 요약 */}
      {comparison.comparison.summary && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              {TEXT.overall_summary[lang]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-800">
                {comparison.comparison.summary}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 종합 권장사항 */}
      {comparison.comparison.recommendations && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              {TEXT.recommendations[lang]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-800">
                {comparison.comparison.recommendations}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 주제별 분석 */}
      {comparison.topics && comparison.topics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {TEXT.topic_analysis[lang]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {comparison.topics.map((topic, index) => (
                <div key={topic.id} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="secondary">주제 {index + 1}</Badge>
                    <h3 className="text-lg font-semibold">{topic.topic_name}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {topic.common_points && (
                      <div>
                        <h4 className="font-medium text-green-700 mb-2 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          {TEXT.common_points[lang]}
                        </h4>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">
                          {topic.common_points}
                        </div>
                      </div>
                    )}
                    
                    {topic.differences && (
                      <div>
                        <h4 className="font-medium text-orange-700 mb-2 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {TEXT.differences[lang]}
                        </h4>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">
                          {topic.differences}
                        </div>
                      </div>
                    )}
                    
                    {topic.insights && (
                      <div>
                        <h4 className="font-medium text-blue-700 mb-2 flex items-center gap-1">
                          <Info className="h-4 w-4" />
                          {TEXT.insights[lang]}
                        </h4>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">
                          {topic.insights}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 