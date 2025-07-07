"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/components/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, Calendar, FileText, PieChart, ChevronDown, ChevronUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, Legend, CartesianGrid
} from 'recharts';

const TEXT = {
  title: { "한국어": "시각화 상세", "English": "Visualization Detail" },
  back: { "한국어": "대시보드로 돌아가기", "English": "Back to Dashboard" },
  title_label: { "한국어": "제목", "English": "Title" },
  description: { "한국어": "설명", "English": "Description" },
  file_name: { "한국어": "파일명", "English": "File Name" },
  chart_type: { "한국어": "차트 유형", "English": "Chart Type" },
  table_key: { "한국어": "선택된 테이블", "English": "Selected Table" },
  created_at: { "한국어": "생성일", "English": "Created At" },
  loading: { "한국어": "로딩 중...", "English": "Loading..." },
  error: { "한국어": "오류가 발생했습니다.", "English": "An error occurred." },
  not_found: { "한국어": "시각화를 찾을 수 없습니다.", "English": "Visualization not found." },
  show_more: { "한국어": "더보기", "English": "Show More" },
  show_less: { "한국어": "접기", "English": "Show Less" },
  chart_data: { "한국어": "차트 데이터", "English": "Chart Data" }
};

// Excel-like color palette
const EXCEL_COLORS = [
  '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47', '#264478', '#9E480E', '#636363', '#997300', '#255E91', '#43682B'
];

interface SurveyVisualization {
  id: string;
  title: string;
  description?: string;
  uploaded_file_name?: string;
  selected_table_key?: string;
  selected_chart_type?: string;
  created_at: string;
  chart_data: { name: string, value: number }[];
  chart_config: {
    chartType: string;
    colors: string[];
    tableKey: string;
  };
}

export default function SurveyVisualizationDetailPage({ params }: { params: { id: string } }) {
  const { lang } = useLanguage();
  const { user, loading: authLoading } = useAuth('/dashboard');
  const [visualization, setVisualization] = useState<SurveyVisualization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [showAllData, setShowAllData] = useState(false);

  const loadVisualization = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('세션이 만료되었습니다.');
      }

      const response = await fetch(`/api/survey-visualizations/${params.id}`, {
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
      setVisualization(data.data);
    } catch (error) {
      console.error('시각화 로드 오류:', error);
      setError(error instanceof Error ? error.message : TEXT.error[lang]);
    } finally {
      setLoading(false);
    }
  }, [user, params.id, lang]);

  useEffect(() => {
    if (user && params.id) {
      loadVisualization();
    }
  }, [user, params.id, loadVisualization]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(lang === "한국어" ? "ko-KR" : "en-US", {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChartTypeLabel = (chartType: string) => {
    const chartTypes = {
      bar: { "한국어": "막대 차트", "English": "Bar Chart" },
      pie: { "한국어": "원형 차트", "English": "Pie Chart" },
      line: { "한국어": "선형 차트", "English": "Line Chart" }
    };
    return chartTypes[chartType as keyof typeof chartTypes]?.[lang] || chartType;
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

  if (!visualization) {
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

  const displayData = showAllData ? visualization.chart_data : visualization.chart_data.slice(0, 10);
  const shouldShowMore = visualization.chart_data.length > 10;

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
          <Card className="bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-100 flex items-center">
                <PieChart className="mr-2 h-4 w-4" />
                {TEXT.title_label[lang]}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm font-medium dark:text-gray-100 text-gray-900">{visualization.title}</p>
            </CardContent>
          </Card>

          {visualization.description && (
            <Card className="bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-100">{TEXT.description[lang]}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-700 dark:text-gray-200">{visualization.description}</p>
              </CardContent>
            </Card>
          )}

          {visualization.uploaded_file_name && (
            <Card className="bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-100 flex items-center">
                  <FileText className="mr-2 h-4 w-4" />
                  {TEXT.file_name[lang]}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm truncate dark:text-gray-100 text-gray-900">{visualization.uploaded_file_name}</p>
              </CardContent>
            </Card>
          )}

          {visualization.selected_chart_type && (
            <Card className="bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-100">{TEXT.chart_type[lang]}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm dark:text-gray-100 text-gray-900">{getChartTypeLabel(visualization.selected_chart_type)}</p>
              </CardContent>
            </Card>
          )}

          {visualization.selected_table_key && (
            <Card className="bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-100">{TEXT.table_key[lang]}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm dark:text-gray-100 text-gray-900">{visualization.selected_table_key}</p>
              </CardContent>
            </Card>
          )}

          <Card className="bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-100 flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                {TEXT.created_at[lang]}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs dark:text-gray-100 text-gray-900">{formatDate(visualization.created_at)}</p>
            </CardContent>
          </Card>
        </div>

        {/* 차트와 데이터 - 큰 메인 영역 */}
        <div className="lg:col-span-3 space-y-6">
          {visualization.chart_data && visualization.chart_data.length > 0 && (
            <Card className="dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
              <CardHeader>
                <CardTitle className="text-xl dark:text-gray-100">{getChartTypeLabel(visualization.selected_chart_type || '')} {lang === "한국어" ? "차트" : "Chart"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-96">
                  {visualization.selected_chart_type === "bar" && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={visualization.chart_data} margin={{ top: 30, right: 30, left: 30, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={60} tick={{ fontSize: 14 }} />
                        <YAxis tick={{ fontSize: 14 }} />
                        <Tooltip wrapperStyle={{ fontSize: 14 }} />
                        <Legend wrapperStyle={{ fontSize: 14 }} />
                        <Bar dataKey="value" fill={EXCEL_COLORS[0]} label={{ position: 'top', fontSize: 14, fill: '#222' }} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  {visualization.selected_chart_type === "pie" && (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie data={visualization.chart_data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label={({ name, value }) => `${name}: ${value}` }>
                          {visualization.chart_data.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={EXCEL_COLORS[idx % EXCEL_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip wrapperStyle={{ fontSize: 14 }} />
                        <Legend wrapperStyle={{ fontSize: 14 }} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  )}
                  {visualization.selected_chart_type === "line" && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={visualization.chart_data} margin={{ top: 30, right: 30, left: 30, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={60} tick={{ fontSize: 14 }} />
                        <YAxis tick={{ fontSize: 14 }} />
                        <Tooltip wrapperStyle={{ fontSize: 14 }} />
                        <Legend wrapperStyle={{ fontSize: 14 }} />
                        <Line type="monotone" dataKey="value" stroke={EXCEL_COLORS[0]} strokeWidth={3} dot label={{ fontSize: 14, fill: '#222' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 차트 데이터 테이블 */}
          {visualization.chart_data && visualization.chart_data.length > 0 && (
            <Card className="dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
              <CardHeader>
                <CardTitle className="text-lg dark:text-gray-100">{TEXT.chart_data[lang]}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-900">
                        <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">이름</th>
                        <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">값</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayData.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'}>
                          <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">{item.name}</td>
                          <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">{item.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {shouldShowMore && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllData(!showAllData)}
                    className="mt-4 text-blue-600 hover:text-blue-800"
                  >
                    {showAllData ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        {TEXT.show_less[lang]}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        {TEXT.show_more[lang]} ({visualization.chart_data.length - 10}개 더)
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 