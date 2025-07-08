"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/components/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { 
  BarChart3, 
  FileText, 
  PieChart, 
  Calendar, 
  Clock, 
  Trash2,
  Eye,
  Download,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Info,
  Users,
  Copy
} from "lucide-react";
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

const TEXT = {
  title: { "한국어": "대시보드", "English": "Dashboard" },
  desc: { "한국어": "내 설문조사 결과들을 확인하세요.", "English": "View your survey results." },
  plans: { "한국어": "설문 계획", "English": "Survey Plans" },
  analyses: { "한국어": "설문 분석", "English": "Survey Analyses" },
  visualizations: { "한국어": "시각화", "English": "Visualizations" },
  no_data: { "한국어": "데이터가 없습니다.", "English": "No data available." },
  loading: { "한국어": "로딩 중...", "English": "Loading..." },
  error: { "한국어": "오류가 발생했습니다.", "English": "An error occurred." },
  delete: { "한국어": "삭제", "English": "Delete" },
  view: { "한국어": "보기", "English": "View" },
  created: { "한국어": "생성일", "English": "Created" },
  topic: { "한국어": "주제", "English": "Topic" },
  title_label: { "한국어": "제목", "English": "Title" },
  description: { "한국어": "설명", "English": "Description" },
  file_name: { "한국어": "파일명", "English": "File Name" },
  chart_type: { "한국어": "차트 유형", "English": "Chart Type" },
  confirm_delete: { "한국어": "정말 삭제하시겠습니까?", "English": "Are you sure you want to delete this?" },
  overview: { "한국어": "전체 개요", "English": "Overview" },
  total_items: { "한국어": "총 항목", "English": "Total Items" },
  recent_activity: { "한국어": "최근 활동", "English": "Recent Activity" },
  analysis_status: { "한국어": "분석 상태", "English": "Analysis Status" },
  statistical_results: { "한국어": "통계 결과", "English": "Statistical Results" },
  workflow_steps: { "한국어": "워크플로우 단계", "English": "Workflow Steps" },
  batch_analysis: { "한국어": "일괄 분석", "English": "Batch Analysis" },
  single_analysis: { "한국어": "단일 분석", "English": "Single Analysis" },
  last_updated: { "한국어": "최근 업데이트", "English": "Last Updated" }
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

interface SurveyAnalysis {
  id: string;
  title: string;
  description?: string;
  uploaded_file_name?: string;
  created_at: string;
  analysis_result: any;
}

interface SurveyVisualization {
  id: string;
  title: string;
  description?: string;
  uploaded_file_name?: string;
  selected_table_key?: string;
  selected_chart_type?: string;
  created_at: string;
  chart_data: any;
  chart_config: any;
}

interface FGIAnalysis {
  id: string;
  title: string;
  description?: string;
  audio_files_count: number;
  doc_files_count: number;
  guide_file_name?: string;
  created_at: string;
  summary_result: any;
}

export default function DashboardPage() {
  const { lang } = useLanguage();
  const { user, loading: authLoading } = useAuth('/dashboard');
  const [plans, setPlans] = useState<SurveyPlan[]>([]);
  const [analyses, setAnalyses] = useState<SurveyAnalysis[]>([]);
  const [visualizations, setVisualizations] = useState<SurveyVisualization[]>([]);
  const [fgiAnalyses, setFgiAnalyses] = useState<FGIAnalysis[]>([]);
  const [fgiTopicAnalyses, setFgiTopicAnalyses] = useState<any[]>([]);
  const [ragSessions, setRagSessions] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [copySuccessQA, setCopySuccessQA] = useState<string | null>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const loadData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('세션이 만료되었습니다.');
      }

      // 설문 계획 로드
      const plansResponse = await fetch('/api/survey-plans', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        setPlans(plansData.data || []);
      }

      // 설문 분석 로드
      const analysesResponse = await fetch('/api/survey-analyses', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (analysesResponse.ok) {
        const analysesData = await analysesResponse.json();
        setAnalyses(analysesData.data || []);
      }

      // 시각화 로드
      const visualizationsResponse = await fetch('/api/survey-visualizations', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (visualizationsResponse.ok) {
        const visualizationsData = await visualizationsResponse.json();
        setVisualizations(visualizationsData.data || []);
      }

      // FGI 분석 로드
      const fgiAnalysesResponse = await fetch('/api/fgi-analyses', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (fgiAnalysesResponse.ok) {
        const fgiAnalysesData = await fgiAnalysesResponse.json();
        setFgiAnalyses(fgiAnalysesData.data || []);
      }

      // FGI 주제별 분석 로드
      const fgiTopicAnalysesResponse = await supabase
        .from('fgi_topic_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!fgiTopicAnalysesResponse.error && fgiTopicAnalysesResponse.data) {
        setFgiTopicAnalyses(fgiTopicAnalysesResponse.data);
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error);
      setError(error instanceof Error ? error.message : TEXT.error[lang]);
    } finally {
      setLoading(false);
    }
  }, [user, lang]);

  // FGI RAG 세션 목록 불러오기
  const loadRagSessions = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('fgi_rag_chats')
      .select('chat_group_id, file_id, created_at, content, role')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (!error && data) {
      // chat_group_id별로 그룹화
      const sessions: Record<string, any> = {};
      data.forEach((row: any) => {
        if (!row.chat_group_id) return;
        if (!sessions[row.chat_group_id]) {
          sessions[row.chat_group_id] = {
            chat_group_id: row.chat_group_id,
            file_id: row.file_id,
            created_at: row.created_at,
            last_message: row.content,
            last_role: row.role,
            last_updated: row.created_at,
            messages: [row],
          };
        } else {
          sessions[row.chat_group_id].last_message = row.content;
          sessions[row.chat_group_id].last_role = row.role;
          sessions[row.chat_group_id].last_updated = row.created_at;
          sessions[row.chat_group_id].messages.push(row);
        }
      });
      setRagSessions(Object.values(sessions).sort((a: any, b: any) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()));
    }
  }, [user]);

  // 내가 저장한 Q&A 불러오기
  const loadFavorites = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('fgi_rag_favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setFavorites(data);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
      loadRagSessions();
      loadFavorites();
    }
  }, [user, loadData, loadRagSessions, loadFavorites]);

  const handleDelete = async (type: 'plan' | 'analysis' | 'visualization' | 'fgi-analysis', id: string) => {
    if (!confirm(TEXT.confirm_delete[lang])) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('세션이 만료되었습니다.');
      }

      const endpoint = type === 'plan' ? '/api/survey-plans' : 
                      type === 'analysis' ? '/api/survey-analyses' : 
                      type === 'fgi-analysis' ? '/api/fgi-analyses' :
                      '/api/survey-visualizations';

      const response = await fetch(`${endpoint}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        // 데이터 다시 로드
        loadData();
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

  // Q&A 복사 함수
  function handleCopyFavoriteQA(q: string, a: string) {
    const text = `Q: ${q}\nA: ${a}`;
    navigator.clipboard.writeText(text);
    setCopySuccessQA(q);
    setTimeout(() => setCopySuccessQA(null), 1200);
  }

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

  return (
    <div className="w-full max-w-screen-xl px-8 py-12 mx-auto dark:bg-gray-900 dark:text-gray-100">
      <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">← 홈으로</Link>
      <LanguageSwitcher />
      <h1 className="text-2xl font-bold mb-4">{TEXT.title[lang]}</h1>
      <p className="mb-8">{TEXT.desc[lang]}</p>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* 전체 개요 섹션 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Info className="mr-2 h-5 w-5" />
          {TEXT.overview[lang]}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {/* 총 항목 수 */}
          <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-200">{TEXT.total_items[lang]}</p>
                  <p className="text-2xl font-bold text-blue-800 dark:text-blue-100">{plans.length + analyses.length + visualizations.length + fgiAnalyses.length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-200" />
              </div>
            </CardContent>
          </Card>

          {/* 설문 계획 수 */}
          <Card className="bg-green-50 border-green-200 dark:bg-green-900 dark:border-green-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-200">{TEXT.plans[lang]}</p>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-100">{plans.length}</p>
                </div>
                <FileText className="h-8 w-8 text-green-600 dark:text-green-200" />
              </div>
            </CardContent>
          </Card>

          {/* 설문 분석 수 */}
          <Card className="bg-purple-50 border-purple-200 dark:bg-purple-900 dark:border-purple-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-200">{TEXT.analyses[lang]}</p>
                  <p className="text-2xl font-bold text-purple-800 dark:text-purple-100">{analyses.length}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600 dark:text-purple-200" />
              </div>
            </CardContent>
          </Card>

          {/* 시각화 수 */}
          <Card className="bg-orange-50 border-orange-200 dark:bg-orange-900 dark:border-orange-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-200">{TEXT.visualizations[lang]}</p>
                  <p className="text-2xl font-bold text-orange-800 dark:text-orange-100">{visualizations.length}</p>
                </div>
                <PieChart className="h-8 w-8 text-orange-600 dark:text-orange-200" />
              </div>
            </CardContent>
          </Card>

          {/* FGI 분석 수 */}
          <Card className="bg-sky-50 border-sky-200 dark:bg-sky-900 dark:border-sky-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-sky-600 dark:text-sky-200">FGI 분석</p>
                  <p className="text-2xl font-bold text-sky-800 dark:text-sky-100">{fgiAnalyses.length}</p>
                </div>
                <Users className="h-8 w-8 text-sky-600 dark:text-sky-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 분석 상태 상세 정보 */}
        {(analyses.length > 0 || fgiAnalyses.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 분석 상태 요약 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  {TEXT.analysis_status[lang]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    const singleAnalyses = analyses.filter(a => a.analysis_result?.analysisMetadata?.analysisType === 'single');
                    const batchAnalyses = analyses.filter(a => a.analysis_result?.analysisMetadata?.analysisType === 'batch');
                    const withStats = analyses.filter(a => a.analysis_result?.statisticalResults);
                    const withWorkflow = analyses.filter(a => a.analysis_result?.workflowSteps?.length > 0);
                    // FGI 분석 통계
                    const fgiCount = fgiAnalyses.length;
                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">FGI 분석</span>
                          <span className="text-sm font-medium">{fgiCount}개</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{TEXT.single_analysis[lang]}</span>
                          <span className="text-sm font-medium">{singleAnalyses.length}개</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{TEXT.batch_analysis[lang]}</span>
                          <span className="text-sm font-medium">{batchAnalyses.length}개</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{TEXT.statistical_results[lang]}</span>
                          <span className="text-sm font-medium">{withStats.length}개</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{TEXT.workflow_steps[lang]}</span>
                          <span className="text-sm font-medium">{withWorkflow.length}개</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* 최근 활동 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  {TEXT.recent_activity[lang]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    const allItems = [
                      ...plans.map(p => ({ ...p, type: 'plan' as const })),
                      ...analyses.map(a => ({ ...a, type: 'analysis' as const })),
                      ...visualizations.map(v => ({ ...v, type: 'visualization' as const })),
                      ...fgiAnalyses.map(f => ({ ...f, type: 'fgi' as const }))
                    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 5);

                    return allItems.map((item, index) => (
                      <div key={`${item.type}-${item.id}`} className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            item.type === 'plan' ? 'bg-green-500' :
                            item.type === 'analysis' ? 'bg-purple-500' :
                            item.type === 'visualization' ? 'bg-orange-500' :
                            'bg-sky-500'
                          }`} />
                          <span className="truncate max-w-32">
                            {item.type === 'plan' ? item.topic : item.title}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(item.created_at)}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {TEXT.plans[lang]} ({plans.length})
          </TabsTrigger>
          <TabsTrigger value="analyses" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {TEXT.analyses[lang]} ({analyses.length})
          </TabsTrigger>
          <TabsTrigger value="visualizations" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            {TEXT.visualizations[lang]} ({visualizations.length})
          </TabsTrigger>
          <TabsTrigger value="fgi-analyses" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            FGI 분석 ({fgiAnalyses.length})
          </TabsTrigger>
          <TabsTrigger value="fgi-topic-analyses" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            FGI 주제별 분석 ({fgiTopicAnalyses.length})
          </TabsTrigger>
          <TabsTrigger value="favorites">FGI 질의 응답</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-6">
          {plans.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">{TEXT.no_data[lang]}</p>
                <Link href="/survey">
                  <Button className="mt-4">첫 번째 설문 계획 만들기</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card key={plan.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="truncate">{plan.topic}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete('plan', plan.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {plan.objective && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">{TEXT.description[lang]}</p>
                        <p className="text-sm text-gray-800 line-clamp-2">{plan.objective}</p>
                      </div>
                    )}
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(plan.created_at)}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/plans/${plan.id}`}>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye className="h-3 w-3 mr-1" />
                          {TEXT.view[lang]}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analyses" className="mt-6">
          {analyses.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">{TEXT.no_data[lang]}</p>
                <Link href="/table-analysis">
                  <Button className="mt-4">첫 번째 설문 분석하기</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {analyses.map((analysis) => (
                <Card key={analysis.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="truncate">{analysis.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete('analysis', analysis.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analysis.description && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">{TEXT.description[lang]}</p>
                        <p className="text-sm text-gray-800 line-clamp-2">{analysis.description}</p>
                      </div>
                    )}
                    {analysis.uploaded_file_name && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">{TEXT.file_name[lang]}</p>
                        <p className="text-sm text-gray-800 truncate">{analysis.uploaded_file_name}</p>
                      </div>
                    )}
                    
                    {/* 분석 상태 정보 */}
                    {analysis.analysis_result && (
                      <div className="space-y-2">
                        {/* 분석 유형 */}
                        {analysis.analysis_result.analysisMetadata?.analysisType && (
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              analysis.analysis_result.analysisMetadata.analysisType === 'single' ? 'bg-blue-500' : 'bg-orange-500'
                            }`} />
                            <span className="text-xs text-gray-600">
                              {analysis.analysis_result.analysisMetadata.analysisType === 'single' ? TEXT.single_analysis[lang] : TEXT.batch_analysis[lang]}
                            </span>
                          </div>
                        )}
                        
                        {/* 통계 결과 여부 */}
                        {analysis.analysis_result.statisticalResults && (
                          <div className="flex items-center">
                            <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                            <span className="text-xs text-gray-600">{TEXT.statistical_results[lang]}</span>
                          </div>
                        )}
                        
                        {/* 워크플로우 단계 수 */}
                        {analysis.analysis_result.workflowSteps?.length > 0 && (
                          <div className="flex items-center">
                            <BarChart3 className="w-3 h-3 text-purple-500 mr-1" />
                            <span className="text-xs text-gray-600">
                              {TEXT.workflow_steps[lang]}: {analysis.analysis_result.workflowSteps.length}단계
                            </span>
                          </div>
                        )}
                        
                        {/* 일괄 분석 정보 */}
                        {analysis.analysis_result.batchInfo && (
                          <div className="flex items-center">
                            <TrendingUp className="w-3 h-3 text-orange-500 mr-1" />
                            <span className="text-xs text-gray-600">
                              {analysis.analysis_result.batchInfo.analyzedQuestions}개 문항 분석
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(analysis.created_at)}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/analyses/${analysis.id}`}>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye className="h-3 w-3 mr-1" />
                          {TEXT.view[lang]}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="visualizations" className="mt-6">
          {visualizations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">{TEXT.no_data[lang]}</p>
                <Link href="/table-visualization">
                  <Button className="mt-4">첫 번째 시각화 만들기</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visualizations.map((visualization) => (
                <Card key={visualization.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="truncate">{visualization.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete('visualization', visualization.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {visualization.description && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">{TEXT.description[lang]}</p>
                        <p className="text-sm text-gray-800 line-clamp-2">{visualization.description}</p>
                      </div>
                    )}
                    {visualization.selected_chart_type && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">{TEXT.chart_type[lang]}</p>
                        <p className="text-sm text-gray-800">{visualization.selected_chart_type}</p>
                      </div>
                    )}
                    {visualization.uploaded_file_name && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">{TEXT.file_name[lang]}</p>
                        <p className="text-sm text-gray-800 truncate">{visualization.uploaded_file_name}</p>
                      </div>
                    )}
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(visualization.created_at)}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/visualizations/${visualization.id}`}>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye className="h-3 w-3 mr-1" />
                          {TEXT.view[lang]}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="fgi-analyses">
          {/* FGI RAG 세션 카드 목록 */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">FGI RAG 대화 세션</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ragSessions.length === 0 && <div className="text-gray-500">대화 세션이 없습니다.</div>}
              {ragSessions.map((session) => (
                <Card key={session.chat_group_id} className="cursor-pointer hover:shadow-lg transition" onClick={() => router.push(`/FGI-analysis?file_id=${session.file_id}&chat_group_id=${session.chat_group_id}`)}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" /> 세션: {session.chat_group_id.slice(0, 8)}...<br/>
                      <span className="text-xs text-gray-400">파일: {session.file_id}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-gray-500 mb-2">생성: {new Date(session.created_at).toLocaleString()}</div>
                    <div className="text-xs text-gray-500 mb-2">최근: {new Date(session.last_updated).toLocaleString()}</div>
                    <div className="text-sm text-gray-800 truncate">{session.last_role === 'user' ? '🙋‍♂️' : '🤖'} {session.last_message}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          {/* 기존 FGI 분석 리스트 */}
          {fgiAnalyses.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">{TEXT.no_data[lang]}</p>
                <Link href="/FGI-analysis">
                  <Button className="mt-4">첫 번째 FGI 분석하기</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fgiAnalyses.map((analysis) => (
                <Card key={analysis.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="truncate">{analysis.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete('fgi-analysis', analysis.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analysis.description && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">{TEXT.description[lang]}</p>
                        <p className="text-sm text-gray-800 line-clamp-2">{analysis.description}</p>
                      </div>
                    )}
                    
                    {/* 파일 정보 */}
                    <div className="space-y-2">
                      {analysis.audio_files_count > 0 && (
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full mr-2 bg-blue-500" />
                          <span className="text-xs text-gray-600">
                            음성 파일: {analysis.audio_files_count}개
                          </span>
                        </div>
                      )}
                      {analysis.doc_files_count > 0 && (
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full mr-2 bg-green-500" />
                          <span className="text-xs text-gray-600">
                            문서 파일: {analysis.doc_files_count}개
                          </span>
                        </div>
                      )}
                      {analysis.guide_file_name && (
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full mr-2 bg-orange-500" />
                          <span className="text-xs text-gray-600">
                            가이드라인: {analysis.guide_file_name}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(analysis.created_at)}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/fgi-analyses/${analysis.id}`}>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye className="h-3 w-3 mr-1" />
                          {TEXT.view[lang]}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="fgi-topic-analyses" className="mt-6">
          {fgiTopicAnalyses.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">주제별 분석 결과가 없습니다.</p>
                <Link href="/FGI-analysis">
                  <Button className="mt-4">첫 번째 주제별 분석하기</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fgiTopicAnalyses.map((item) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="truncate">{item.guide_file_name || item.fgi_file_id}</span>
                      <span className="text-xs text-blue-600 ml-2">{item.analysis_tone}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600">주제 개수</p>
                      <p className="text-sm text-gray-800">{Array.isArray(item.topics) ? item.topics.length : 0}개</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">주제 목록</p>
                      <p className="text-xs text-gray-800 line-clamp-2">{Array.isArray(item.topics) ? item.topics.join(', ') : ''}</p>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(item.created_at)}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/fgi-topic-analyses/${item.id}`}>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye className="h-3 w-3 mr-1" />
                          상세 보기
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="favorites">
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">FGI 질의 응답</h2>
            {/* RAG 대화 세션 카드 */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">FGI RAG 대화 세션</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ragSessions.length === 0 && <div className="text-gray-500">대화 세션이 없습니다.</div>}
                {ragSessions.map((session) => (
                  <Card key={session.chat_group_id} className="cursor-pointer hover:shadow-lg transition">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" /> 세션: {session.chat_group_id.slice(0, 8)}...<br/>
                        <span className="text-xs text-gray-400">파일: {session.file_id}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-gray-500 mb-2">생성: {new Date(session.created_at).toLocaleString()}</div>
                      <div className="text-xs text-gray-500 mb-2">최근: {new Date(session.last_updated).toLocaleString()}</div>
                      <div className="text-sm text-gray-800 truncate">{session.last_role === 'user' ? '🙋‍♂️' : '🤖'} {session.last_message}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            {/* 즐겨찾기 Q&A 카드 */}
            <div>
              <h3 className="text-lg font-semibold mb-2">내가 저장한 Q&A</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[70vh] overflow-y-auto p-2 bg-white rounded-lg shadow-inner">
                {favorites.length === 0 && <div className="text-gray-500">저장된 Q&A가 없습니다.</div>}
                {favorites.map((fav, idx) => (
                  <Card key={fav.id || idx} className="mb-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {fav.title || 'Q&A'}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (!confirm('정말 삭제하시겠습니까?')) return;
                            const { error } = await supabase
                              .from('fgi_rag_favorites')
                              .delete()
                              .eq('id', fav.id);
                            if (!error) {
                              setFavorites(favorites.filter(f => f.id !== fav.id));
                            } else {
                              alert('삭제에 실패했습니다.');
                            }
                          }}
                          className="text-red-600 hover:text-red-800 ml-auto"
                          title="삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-gray-500 mb-1">{fav.description}</div>
                      <div className="text-sm font-semibold mb-1 truncate">Q: {fav.question}</div>
                      <div className="text-sm mb-2 truncate">A: {fav.answer?.slice(0, 80)}{fav.answer && fav.answer.length > 80 ? '...' : ''}</div>
                      <div className="text-xs text-gray-400 mb-2">{new Date(fav.created_at).toLocaleString()}</div>
                      <div className="flex gap-2 items-center">
                        <button title="복사" onClick={() => handleCopyFavoriteQA(fav.question, fav.answer)} className="p-1 rounded hover:bg-blue-100"><Copy className="w-4 h-4 text-blue-500" /></button>
                        {copySuccessQA === fav.question && <span className="text-xs text-green-600 ml-1">복사됨!</span>}
                        <Link href={`/dashboard/favorites/${fav.id}`} className="flex-1">
                          <Button size="sm" variant="outline" className="w-full flex items-center justify-center">
                            <Eye className="h-3 w-3 mr-1" /> 상세 보기
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 