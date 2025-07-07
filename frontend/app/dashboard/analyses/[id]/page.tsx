"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/components/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, Calendar, FileText, BarChart3, ChevronDown, ChevronUp, Workflow, Info } from "lucide-react";

const TEXT = {
  title: { "한국어": "설문 분석 상세", "English": "Survey Analysis Detail" },
  back: { "한국어": "대시보드로 돌아가기", "English": "Back to Dashboard" },
  title_label: { "한국어": "제목", "English": "Title" },
  description: { "한국어": "설명", "English": "Description" },
  file_name: { "한국어": "파일명", "English": "File Name" },
  created_at: { "한국어": "생성일", "English": "Created At" },
  summary: { "한국어": "요약", "English": "Summary" },
  key_findings: { "한국어": "주요 발견사항", "English": "Key Findings" },
  recommendations: { "한국어": "권장사항", "English": "Recommendations" },
  loading: { "한국어": "로딩 중...", "English": "Loading..." },
  error: { "한국어": "오류가 발생했습니다.", "English": "An error occurred." },
  not_found: { "한국어": "설문 분석을 찾을 수 없습니다.", "English": "Survey analysis not found." },
  show_more: { "한국어": "더보기", "English": "Show More" },
  show_less: { "한국어": "접기", "English": "Show Less" }
};

interface SurveyAnalysis {
  id: string;
  title: string;
  description?: string;
  uploaded_file_name?: string;
  created_at: string;
  analysis_result?: {
    summary?: string;
    keyFindings?: string[];
    recommendations?: string[];
    timestamp?: string;
    statisticalResults?: {
      testType: string;
      questionKey: string;
      summary: string;
      results: any[];
      error?: string;
    };
    workflowSteps?: string[];
    analysisMetadata?: {
      analysisType: string;
      selectedQuestion?: string;
      totalQuestions: number;
      fileNames: { rawDataFile: string };
    };
    batchInfo?: {
      analyzedQuestions: number;
      analysisTypes: string[];
    };
  };
}

export default function SurveyAnalysisDetailPage({ params }: { params: { id: string } }) {
  const { lang } = useLanguage();
  const { user, loading: authLoading } = useAuth('/dashboard');
  const [analysis, setAnalysis] = useState<SurveyAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});

  const loadAnalysis = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('세션이 만료되었습니다.');
      }

      const response = await fetch(`/api/survey-analyses/${params.id}`, {
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
      setAnalysis(data.data);
    } catch (error) {
      console.error('설문 분석 로드 오류:', error);
      setError(error instanceof Error ? error.message : TEXT.error[lang]);
    } finally {
      setLoading(false);
    }
  }, [user, params.id, lang]);

  useEffect(() => {
    if (user && params.id) {
      loadAnalysis();
    }
  }, [user, params.id, loadAnalysis]);

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

  const renderExpandableContent = (content: string | string[], sectionKey: string, title: string) => {
    const isExpanded = expandedSections[sectionKey];
    const contentText = Array.isArray(content) ? content.join('\n') : content;
    const shouldShowExpand = contentText.length > 500;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`${!isExpanded && shouldShowExpand ? 'line-clamp-8' : ''}`}>
            {Array.isArray(content) ? (
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                {content.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                {content}
              </div>
            )}
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

  if (!analysis) {
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
                <BarChart3 className="mr-2 h-4 w-4" />
                {TEXT.title_label[lang]}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm font-medium">{analysis.title}</p>
            </CardContent>
          </Card>

          {analysis.description && (
            <Card className="bg-gray-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">{TEXT.description[lang]}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-700">{analysis.description}</p>
              </CardContent>
            </Card>
          )}

          {analysis.uploaded_file_name && (
            <Card className="bg-gray-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <FileText className="mr-2 h-4 w-4" />
                  {TEXT.file_name[lang]}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-700 truncate">{analysis.uploaded_file_name}</p>
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
              <p className="text-xs text-gray-600">{formatDate(analysis.created_at)}</p>
            </CardContent>
          </Card>
        </div>

        {/* 분석 결과 - 큰 메인 영역 */}
        <div className="lg:col-span-3 space-y-6">
          {analysis.analysis_result?.summary && renderExpandableContent(
            analysis.analysis_result.summary,
            'summary',
            TEXT.summary[lang]
          )}

          {analysis.analysis_result?.keyFindings && analysis.analysis_result.keyFindings.length > 0 && renderExpandableContent(
            analysis.analysis_result.keyFindings,
            'findings',
            TEXT.key_findings[lang]
          )}

          {analysis.analysis_result?.recommendations && analysis.analysis_result.recommendations.length > 0 && renderExpandableContent(
            analysis.analysis_result.recommendations,
            'recommendations',
            TEXT.recommendations[lang]
          )}

          {/* 통계 분석 결과 표시 */}
          {analysis.analysis_result?.statisticalResults && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  📊 통계 분석 결과
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">분석 유형:</span> {analysis.analysis_result.statisticalResults.testType}
                    </div>
                    <div>
                      <span className="font-medium">분석된 질문:</span> {analysis.analysis_result.statisticalResults.questionKey}
                    </div>
                  </div>
                  
                  {analysis.analysis_result.statisticalResults.summary && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">요약:</span> {analysis.analysis_result.statisticalResults.summary}
                      </p>
                    </div>
                  )}
                  
                  {analysis.analysis_result.statisticalResults.results && analysis.analysis_result.statisticalResults.results.length > 0 && (
                    <div className="overflow-x-auto border rounded-lg bg-white p-4 shadow-sm">
                      <table className="min-w-full text-xs text-left text-gray-700">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 font-semibold">대분류</th>
                            <th className="px-3 py-2 font-semibold">통계량</th>
                            <th className="px-3 py-2 font-semibold">p-value</th>
                            <th className="px-3 py-2 font-semibold">유의성</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysis.analysis_result.statisticalResults.results.map((row: any, idx: number) => (
                            <tr key={idx} className="border-b last:border-b-0 hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium">{row["대분류"] || ""}</td>
                              <td className="px-3 py-2">{isNaN(row["통계량"]) ? "" : row["통계량"]}</td>
                              <td className="px-3 py-2">{isNaN(row["p-value"]) ? "" : row["p-value"]}</td>
                              <td className="px-3 py-2">
                                <span className={`font-bold ${
                                  row["유의성"] === "***" ? "text-red-600" :
                                  row["유의성"] === "**" ? "text-orange-600" :
                                  row["유의성"] === "*" ? "text-yellow-600" : "text-gray-400"
                                }`}>
                                  {row["유의성"] || ""}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {analysis.analysis_result.statisticalResults.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">
                        <span className="font-medium">오류:</span> {analysis.analysis_result.statisticalResults.error}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 워크플로우 단계 표시 */}
          {analysis.analysis_result?.workflowSteps && analysis.analysis_result.workflowSteps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Workflow className="mr-2 h-5 w-5" />
                  🔄 분석 진행 과정
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 border rounded p-3 text-xs font-mono whitespace-pre-line max-h-64 overflow-y-auto">
                  {analysis.analysis_result.workflowSteps.map((step: string, idx: number) => (
                    <div key={idx} className="mb-1">
                      <span className="text-blue-600">[{idx + 1}]</span> {step}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 분석 메타데이터 표시 */}
          {analysis.analysis_result?.analysisMetadata && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Info className="mr-2 h-5 w-5" />
                  📋 분석 정보
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">분석 유형:</span> {analysis.analysis_result.analysisMetadata.analysisType === 'single' ? '단일 분석' : '일괄 분석'}
                  </div>
                  {analysis.analysis_result.analysisMetadata.selectedQuestion && (
                    <div>
                      <span className="font-medium">선택된 질문:</span> {analysis.analysis_result.analysisMetadata.selectedQuestion}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">총 질문 수:</span> {analysis.analysis_result.analysisMetadata.totalQuestions}개
                  </div>
                  <div>
                    <span className="font-medium">원본 데이터 파일:</span> {analysis.analysis_result.analysisMetadata.fileNames.rawDataFile}
                  </div>
                  {analysis.analysis_result.batchInfo && (
                    <>
                      <div>
                        <span className="font-medium">분석된 질문:</span> {analysis.analysis_result.batchInfo.analyzedQuestions}개
                      </div>
                      <div>
                        <span className="font-medium">분석 유형들:</span> {analysis.analysis_result.batchInfo.analysisTypes.join(', ')}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {analysis.analysis_result?.timestamp && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">분석 완료 시간</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{formatDate(analysis.analysis_result.timestamp)}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 