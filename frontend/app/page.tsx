"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, BarChart3, FileText, TrendingUp, Database, Download, ClipboardList, Bot, Brain, Workflow, Zap, Users } from "lucide-react";
import Link from "next/link";
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/components/LanguageContext';
import dynamic from "next/dynamic";
import { useState } from 'react';


const Header = dynamic(() => import('@/components/Header'), { ssr: false });

const TEXT = {
  page_title: { "한국어": "데이터 분석 플랫폼", "English": "Data Analysis Platform" },
  nav_upload: { "한국어": "업로드", "English": "Upload" },
  nav_survey: { "한국어": "설문분석", "English": "Survey" },
  nav_ai_agent: { "한국어": "AI 에이전트", "English": "AI Agent" },
  nav_dashboard: { "한국어": "대시보드", "English": "Dashboard" },
  hero_title: { "한국어": "데이터 분석 플랫폼", "English": "Data Analysis Platform" },
  hero_description: { "한국어": "Next.js, AI SDK, PostgreSQL 기반의 현대적 데이터 분석 솔루션. 일반 데이터 분석부터 AI 기반 설문분석까지 지원합니다.", "English": "Modern data analysis solution using Next.js, AI SDK, and PostgreSQL. Supporting everything from general data analysis to AI-powered survey analysis." },
  get_started_button: { "한국어": "시작하기", "English": "Get Started" },
  try_ai_analysis_button: { "한국어": "AI 분석 체험", "English": "Try AI Analysis" },
  general_data_analysis_title: { "한국어": "일반 데이터 분석", "English": "General Data Analysis" },
  general_data_analysis_description: { "한국어": "CSV, Excel, JSON, TSV 파일 업로드 후 통계 분석 및 시각화", "English": "Upload CSV, Excel, JSON, TSV files for statistical analysis and visualization" },
  descriptive_statistics_and_correlation_analysis: { "한국어": "기술통계 및 상관분석", "English": "Descriptive statistics and correlation analysis" },
  interactive_charts_and_graphs: { "한국어": "인터랙티브 차트 및 그래프", "English": "Interactive charts and graphs" },
  automatic_data_cleaning: { "한국어": "자동 데이터 정제", "English": "Automatic data cleaning" },
  project_management_and_storage: { "한국어": "프로젝트 관리 및 저장", "English": "Project management and storage" },
  start_analysis_button: { "한국어": "분석 시작", "English": "Start Analysis" },
  survey_analysis_title: { "한국어": "설문분석", "English": "Survey Analysis" },
  automatic_parsing_and_professional_analysis_of_excel_based_survey_statistics: { "한국어": "엑셀 기반 설문 통계 자동 파싱 및 전문 분석", "English": "Automatic parsing and professional analysis of Excel-based survey statistics" },
  automatic_survey_statistics_parsing: { "한국어": "설문 통계 자동 파싱", "English": "Automatic survey statistics parsing" },
  f_test_t_test_chi_square_test: { "한국어": "F-test, t-test, 카이제곱 검정", "English": "F-test, t-test, Chi-square test" },
  individual_question_analysis: { "한국어": "개별 문항 분석", "English": "Individual question analysis" },
  result_visualization_and_reports: { "한국어": "결과 시각화 및 보고서", "English": "Result visualization and reports" },
  survey_analysis_button: { "한국어": "설문분석", "English": "Survey Analysis" },
  ai_table_analysis_title: { "한국어": "AI 테이블 분석", "English": "AI Table Analysis" },
  langgraph_based_ai_workflow_for_automatic_analysis_and_report_generation: { "한국어": "LangGraph 기반 AI 워크플로우로 자동 분석 및 보고서 생성", "English": "LangGraph-based AI workflow for automatic analysis and report generation" },
  langgraph_workflow: { "한국어": "LangGraph 워크플로우", "English": "LangGraph workflow" },
  f_t_test_chi_square_manual_analysis: { "한국어": "F/T-test, 카이제곱, 임의 분석", "English": "F/T-test, Chi-square, Manual analysis" },
  intelligent_statistical_test_method_selection: { "한국어": "지능형 통계 검정 방법 선택", "English": "Intelligent statistical test method selection" },
  hallucination_verification_and_retry: { "한국어": "환각 검증 및 재시도", "English": "Hallucination verification and retry" },
  multi_language_support_korean_english: { "한국어": "다국어 지원 (한국어/영어)", "English": "Multi-language support (Korean/English)" },
  ai_analysis_button: { "한국어": "AI 분석", "English": "AI Analysis" },
  interactive_visualizations_title: { "한국어": "인터랙티브 시각화", "English": "Interactive Visualizations" },
  create_beautiful_charts_graphs_and_interactive_plots_to_understand_your_data_better: { "한국어": "아름다운 차트, 그래프, 인터랙티브 플롯 생성", "English": "Create beautiful charts, graphs, and interactive plots to understand your data better." },
  statistical_analysis_title: { "한국어": "통계 분석", "English": "Statistical Analysis" },
  get_comprehensive_statistics_correlation_analysis_and_data_quality_insights: { "한국어": "종합 통계, 상관분석, 데이터 품질 인사이트 제공", "English": "Get comprehensive statistics, correlation analysis, and data quality insights." },
  data_cleaning_title: { "한국어": "데이터 정제", "English": "Data Cleaning" },
  handle_missing_values_outliers_and_data_type_conversion_automatically: { "한국어": "결측치, 이상치, 데이터 타입 자동 처리", "English": "Handle missing values, outliers, and data type conversion automatically." },
  langgraph_implementation_title: { "한국어": "LangGraph 구현", "English": "LangGraph Implementation" },
  ai_workflow_implemented_in_two_different_ways: { "한국어": "두 가지 방식의 AI 워크플로우 구현", "English": "AI workflow implemented in two different ways" },
  python_backend_api_recommended: { "한국어": "파이썬 백엔드 API (추천)", "English": "Python Backend API (Recommended)" },
  fastapi_based_rest_api_for_running_langgraph_workflows: { "한국어": "LangGraph 워크플로우 실행용 FastAPI 기반 REST API", "English": "FastAPI-based REST API for running LangGraph workflows." },
  langchain_and_openai_integration: { "한국어": "LangChain 및 OpenAI 연동", "English": "LangChain and OpenAI integration" },
  asynchronous_workflow_execution: { "한국어": "비동기 워크플로우 실행", "English": "Asynchronous workflow execution" },
  file_upload_and_processing: { "한국어": "파일 업로드 및 처리", "English": "File upload and processing" },
  npm_run_backend_start: { "한국어": "npm run backend:start", "English": "npm run backend:start" },
  javascript_workflow_engine: { "한국어": "자바스크립트 워크플로우 엔진", "English": "JavaScript Workflow Engine" },
  pure_javascript_implementation_of_workflow_engine: { "한국어": "순수 자바스크립트 워크플로우 엔진 구현", "English": "Pure JavaScript implementation of workflow engine." },
  direct_execution_in_browser: { "한국어": "브라우저 직접 실행", "English": "Direct execution in browser" },
  direct_openai_api_calls: { "한국어": "OpenAI API 직접 호출", "English": "Direct OpenAI API calls" },
  real_time_progress_tracking: { "한국어": "실시간 진행 상황 추적", "English": "Real-time progress tracking" },
  auto_executed_in_browser: { "한국어": "브라우저에서 자동 실행", "English": "Auto-executed in browser" },
  quick_start_guide_title: { "한국어": "🚀 빠른 시작 가이드", "English": "🚀 Quick Start Guide" },
  start_data_analysis_in_just_a_few_steps: { "한국어": "몇 단계만에 데이터 분석 시작", "English": "Start data analysis in just a few steps" },
  upload_files: { "한국어": "파일 업로드", "English": "Upload Files" },
  upload_csv_excel_json_files_or_prepare_survey_statistics_tables: { "한국어": "CSV, Excel, JSON 파일 업로드 또는 설문 통계표 준비", "English": "Upload CSV, Excel, JSON files or prepare survey statistics tables." },
  choose_analysis: { "한국어": "분석 선택", "English": "Choose Analysis" },
  select_from_general_analysis_survey_analysis_or_ai_table_analysis: { "한국어": "일반 분석, 설문분석, AI 테이블 분석 중 선택", "English": "Select from general analysis, survey analysis, or AI table analysis." },
  view_results: { "한국어": "결과 확인", "English": "View Results" },
  check_analysis_results_and_visualizations_to_derive_insights: { "한국어": "분석 결과와 시각화를 확인하여 인사이트 도출", "English": "Check analysis results and visualizations to derive insights." },
  data_analysis_platform: { "한국어": "데이터 분석 플랫폼", "English": "Data Analysis Platform" },
  all_rights_reserved: { "한국어": "All rights reserved.", "English": "All rights reserved." },
};

type SampleTableRow = { [key: string]: string | number };

const sampleTable: SampleTableRow[] = [
  { 대분류: '전체', 소분류: '', 사례수: 800, '전혀 관심이 없다': 1.2, '관심이 없는 편': 5.1, 보통: 20.3, '관심이 있는 편': 55.0, '매우 관심 있다': 18.4, '관심없다 %': 6.3, '보통 %': 20.3, '관심있다 %': 73.4, '평균(5점척도)': 3.8 },
  { 대분류: '성별', 소분류: '남성', 사례수: 390, '전혀 관심이 없다': 1.5, '관심이 없는 편': 6.0, 보통: 21.0, '관심이 있는 편': 53.0, '매우 관심 있다': 18.5, '관심없다 %': 7.5, '보통 %': 21.0, '관심있다 %': 71.5, '평균(5점척도)': 3.7 },
  { 대분류: '성별', 소분류: '여성', 사례수: 410, '전혀 관심이 없다': 0.9, '관심이 없는 편': 4.2, 보통: 19.7, '관심이 있는 편': 57.0, '매우 관심 있다': 18.2, '관심없다 %': 5.1, '보통 %': 19.7, '관심있다 %': 75.2, '평균(5점척도)': 3.9 },
  { 대분류: '연령', 소분류: '20대', 사례수: 120, '전혀 관심이 없다': 2.0, '관심이 없는 편': 7.0, 보통: 25.0, '관심이 있는 편': 50.0, '매우 관심 있다': 16.0, '관심없다 %': 9.0, '보통 %': 25.0, '관심있다 %': 66.0, '평균(5점척도)': 3.6 },
  { 대분류: '연령', 소분류: '30대', 사례수: 180, '전혀 관심이 없다': 1.0, '관심이 없는 편': 5.0, 보통: 22.0, '관심이 있는 편': 56.0, '매우 관심 있다': 16.0, '관심없다 %': 6.0, '보통 %': 22.0, '관심있다 %': 72.0, '평균(5점척도)': 3.8 },
  { 대분류: '연령', 소분류: '40대', 사례수: 160, '전혀 관심이 없다': 0.5, '관심이 없는 편': 3.5, 보통: 18.0, '관심이 있는 편': 60.0, '매우 관심 있다': 18.0, '관심없다 %': 4.0, '보통 %': 18.0, '관심있다 %': 78.0, '평균(5점척도)': 4.0 },
];

const sampleTableHeaders = [
  '대분류', '소분류', '사례수', '전혀 관심이 없다', '관심이 없는 편', '보통', '관심이 있는 편', '매우 관심 있다', '관심없다 %', '보통 %', '관심있다 %', '평균(5점척도)'
];

const sampleAnalysis = `
- 40대의 관심도가 가장 높음 (관심있다 %: 78.0)
- 20대의 관심도가 가장 낮음 (관심있다 %: 66.0)
- 전체 평균 관심도(5점척도): 3.8점
`;

const sampleQuestion = 'A1. 귀하께서는 평소에 서울시 교통 혼잡 문제에 대해 얼마나 관심이 있으십니까? (전체 단위: %)';

// Define the type for the analysis result
interface DemoAnalysisResult {
  columnNames: string[];
  numericColumns: string[];
  stats: any | null;
  missing: { [key: string]: number };
  corr: { [key: string]: { [key: string]: number } };
}

// 샘플 설문 데이터 구조 (실제 분석 워크플로우에 맞게 최소화)
const sampleSurveyDataForWorkflow = {
  questionKeys: ['A1'],
  questionTexts: {
    A1: 'A1. 귀하께서는 평소에 서울시 교통 혼잡 문제에 대해 얼마나 관심이 있으십니까? (전체 단위: %)',
  },
  tables: {
    A1: {
      columns: [
        '대분류', '소분류', '사례수', '전혀 관심이 없다', '관심이 없는 편', '보통', '관심이 있는 편', '매우 관심 있다', '관심없다 %', '보통 %', '관심있다 %', '평균(5점척도)'
      ],
      data: [
        ['전체', '', 800, 1.2, 5.1, 20.3, 55.0, 18.4, 6.3, 20.3, 73.4, 3.8],
        ['성별', '남성', 390, 1.5, 6.0, 21.0, 53.0, 18.5, 7.5, 21.0, 71.5, 3.7],
        ['성별', '여성', 410, 0.9, 4.2, 19.7, 57.0, 18.2, 5.1, 19.7, 75.2, 3.9],
        ['연령', '20대', 120, 2.0, 7.0, 25.0, 50.0, 16.0, 9.0, 25.0, 66.0, 3.6],
        ['연령', '30대', 180, 1.0, 5.0, 22.0, 56.0, 16.0, 6.0, 22.0, 72.0, 3.8],
        ['연령', '40대', 160, 0.5, 3.5, 18.0, 60.0, 18.0, 4.0, 18.0, 78.0, 4.0],
      ],
    },
  },
};

// 하드코딩된 데모용 통계표 데이터
const demoTableHeaders = [
  '대분류', '소분류', '사례수', '전혀 관심이 없다', '관심이 없는 편', '보통', '관심이 있는 편', '매우 관심 있다', '관심없다 %', '보통 %', '관심있다 %', '평균(5점척도)'
];
const demoTableRows = [
  ['전체', '', 100, 2, 8, 30, 40, 20, 10, 30, 60, 3.7],
  ['성별', '남성', 50, 3, 10, 15, 15, 7, 13, 15, 72, 3.8],
  ['성별', '여성', 50, 1, 6, 15, 25, 13, 7, 15, 78, 3.9],
  ['연령', '20대', 20, 2, 5, 7, 4, 2, 14, 7, 79, 3.9],
  ['연령', '30대', 40, 1, 7, 13, 13, 6, 8, 13, 79, 3.8],
  ['연령', '40대', 40, 2, 6, 10, 23, 9, 8, 10, 82, 3.9],
];

// 하드코딩된 데모용 raw data (CSV)
const demoRawCsv = `성별,연령,관심도\n남성,20대,3\n여성,30대,4\n남성,40대,5\n여성,20대,2\n남성,30대,4\n여성,40대,5\n남성,20대,3\n여성,30대,4\n남성,40대,5\n여성,20대,2`;
const demoRawRows = [
  ['남성', '20대', 3],
  ['여성', '30대', 4],
  ['남성', '40대', 5],
  ['여성', '20대', 2],
  ['남성', '30대', 4],
  ['여성', '40대', 5],
  ['남성', '20대', 3],
  ['여성', '30대', 4],
  ['남성', '40대', 5],
  ['여성', '20대', 2],
];
const demoRawHeaders = ['성별', '연령', '관심도'];

// 하드코딩된 통계 검정 결과 표 (f/t test)
const demoStatTestHeaders = ['집단', 'N', '평균', '표준편차', 't/F', 'p값'];
const demoStatTestRows = [
  ['남성', 5, 3.8, 0.84, '', ''],
  ['여성', 5, 4.0, 1.00, '', ''],
  ['전체', 10, 3.9, 0.92, '', ''],
  ['t-test', '', '', '', '1.23', '0.048'],
];

// 하드코딩된 최종 분석 결과
const demoFinalResult = `\n- 여성의 평균 관심도(4.0)가 남성(3.8)보다 높음\n- t-test 결과, 두 집단 간 관심도 차이가 통계적으로 유의함(p = 0.048 < 0.05)\n- 연령대별로도 관심도 평균이 3.8~3.9로 비슷하나, 40대가 소폭 높음\n- 전체 평균 관심도는 3.9점\n`;

export default function HomeDemo() {
  const { lang } = useLanguage();
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[] | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<string[]>([]);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [showDemoResult, setShowDemoResult] = useState(false);

  const handleDemoAnalysis = () => {
    setShowDemoResult(true);
  };

  const handleQuestionSuggest = () => {
    setLoadingQuestions(true);
    setTimeout(() => {
      if (topic.trim()) {
        setSuggestedQuestions([
          `이 주제(${topic})에 대해 얼마나 관심이 있으신가요?`,
          `이 주제(${topic})와 관련해 개선이 필요하다고 생각하는 점은 무엇인가요?`,
          `이 주제(${topic})에 대해 추가로 의견이 있으신가요?`,
        ]);
      } else {
        setSuggestedQuestions([sampleQuestion]);
      }
      setLoadingQuestions(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 relative">
      <div className="w-full flex justify-end px-4 pt-4">
        <LanguageSwitcher />
      </div>
      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {TEXT.hero_title[lang]}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            {TEXT.hero_description[lang]}
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/upload">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                <Upload className="mr-2 h-5 w-5" />
                {TEXT.get_started_button[lang]}
              </Button>
            </Link>
            <Link href="/analysis">
              <Button size="lg" variant="outline">
                <Bot className="mr-2 h-5 w-5" />
                {TEXT.try_ai_analysis_button[lang]}
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Survey Planning */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ClipboardList className="mr-2 h-6 w-6 text-blue-600" />
                {lang === "한국어" ? "설문조사 계획 수립" : "Survey Planning"}
              </CardTitle>
              <CardDescription>
                {lang === "한국어"
                  ? "AI가 설문 문항 설계와 구조를 도와줍니다."
                  : "AI helps you design and structure your survey."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• {lang === "한국어" ? "설문 목적 및 대상 정의" : "Define survey objectives and target audience"}</li>
                <li>• {lang === "한국어" ? "문항 유형 및 흐름 설계" : "Design question types and flow"}</li>
                <li>• {lang === "한국어" ? "AI 기반 문항 추천" : "AI-powered question suggestions"}</li>
                <li>• {lang === "한국어" ? "설문 구조 시각화" : "Visualize survey structure"}</li>
              </ul>
              <Link href="/survey" className="mt-4 inline-block">
                <Button variant="outline" size="sm">
                  {lang === "한국어" ? "계획 세우기" : "Plan Survey"}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Survey Analysis */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-6 w-6 text-green-600" />
                {lang === "한국어" ? "설문분석" : "Survey Analysis"}
              </CardTitle>
              <CardDescription>
                {lang === "한국어"
                  ? "엑셀 기반 설문 통계 자동 파싱 및 전문 분석"
                  : "Automatic parsing and professional analysis of Excel-based survey statistics"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• {lang === "한국어" ? "설문 통계 자동 파싱" : "Automatic survey statistics parsing"}</li>
                <li>• <b>F-test, t-test,</b> {lang === "한국어" ? "카이제곱 검정" : "Chi-square test"}</li>
                <li>• {lang === "한국어" ? "개별 문항 분석" : "Individual question analysis"}</li>
                                <li>• {lang === "한국어" ? "결과 시각화 및 보고서" : "Result visualization and reports"}</li>
              </ul>
              <Link href="/table-analysis" className="mt-4 inline-block">
                <Button variant="outline" size="sm">
                  {lang === "한국어" ? "설문분석" : "Survey Analysis"}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Survey Result Visualization */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-6 w-6 text-purple-600" />
                {lang === "한국어" ? "설문 결과 시각화" : "Survey Result Visualization"}
              </CardTitle>
              <CardDescription>
                {lang === "한국어"
                  ? "설문 결과를 다양한 차트와 그래프로 시각화합니다."
                  : "Visualize your survey results with various charts and graphs."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• {lang === "한국어" ? "막대/원형/선형 차트 지원" : "Bar, pie, and line chart support"}</li>
                <li>• {lang === "한국어" ? "문항별/집단별 비교 시각화" : "Visualize by question or group"}</li>
                <li>• {lang === "한국어" ? "대시보드 및 PDF 보고서" : "Dashboard and PDF reports"}</li>
                <li>• {lang === "한국어" ? "커스텀 필터 및 하이라이트" : "Custom filters and highlights"}</li>
              </ul>
              <Link href="/table-visualization" className="mt-4 inline-block">
                <Button variant="outline" size="sm">
                  {lang === "한국어" ? "시각화하기" : "Visualize"}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* FGI 분석 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-6 w-6 text-orange-500" />
                {lang === "한국어" ? "FGI 분석" : "FGI Analysis"}
              </CardTitle>
              <CardDescription>
                {lang === "한국어"
                  ? "FGI(Focus Group Interview) 회의를 음성 녹음 또는 텍스트 문서로 분석하여 전문적인 보고서를 생성합니다."
                  : "Analyze FGI (Focus Group Interview) meetings through audio recordings or text documents to generate professional reports."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• {lang === "한국어" ? "오디오/문서 업로드 및 STT 변환" : "Upload audio/documents & STT"}</li>
                <li>• {lang === "한국어" ? "Q&A/길이 기반 청크 분할" : "Q&A or length-based chunking"}</li>
                <li>• {lang === "한국어" ? "LLM 기반 좌담회 분석" : "LLM-based FGI analysis"}</li>
                <li>• {lang === "한국어" ? "주제별/최종 요약 자동 생성" : "Auto topic/final summary"}</li>
              </ul>
              <Link href="/FGI-analysis" className="mt-4 inline-block">
                <Button variant="outline" size="sm">
                  {lang === "한국어" ? "FGI 분석 시작" : "Start FGI Analysis"}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* LangGraph Implementation Section */}
        <Card className="mb-16">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Workflow className="mr-2 h-6 w-6 text-orange-600" />
              {TEXT.langgraph_implementation_title[lang]}
            </CardTitle>
            <CardDescription>
              {TEXT.ai_workflow_implemented_in_two_different_ways[lang]}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Python Backend */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center">
                  <Brain className="mr-2 h-5 w-5 text-blue-600" />
                  {TEXT.python_backend_api_recommended[lang]}
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-3">
                    {TEXT.fastapi_based_rest_api_for_running_langgraph_workflows[lang]}
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <Zap className="mr-2 h-4 w-4 text-green-600" />
                      {TEXT.langchain_and_openai_integration[lang]}
                    </div>
                    <div className="flex items-center">
                      <Zap className="mr-2 h-4 w-4 text-green-600" />
                      {TEXT.asynchronous_workflow_execution[lang]}
                    </div>
                    <div className="flex items-center">
                      <Zap className="mr-2 h-4 w-4 text-green-600" />
                      {TEXT.file_upload_and_processing[lang]}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-900 text-green-400 p-3 rounded text-sm font-mono">
                  {TEXT.npm_run_backend_start[lang]}
                </div>
              </div>

              {/* JavaScript Engine */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center">
                  <Zap className="mr-2 h-5 w-5 text-yellow-600" />
                  {TEXT.javascript_workflow_engine[lang]}
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-3">
                    {TEXT.pure_javascript_implementation_of_workflow_engine[lang]}
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <Zap className="mr-2 h-4 w-4 text-green-600" />
                      {TEXT.direct_execution_in_browser[lang]}
                    </div>
                    <div className="flex items-center">
                      <Zap className="mr-2 h-4 w-4 text-green-600" />
                      {TEXT.direct_openai_api_calls[lang]}
                    </div>
                    <div className="flex items-center">
                      <Zap className="mr-2 h-4 w-4 text-green-600" />
                      {TEXT.real_time_progress_tracking[lang]}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-900 text-green-400 p-3 rounded text-sm font-mono">
                  {TEXT.auto_executed_in_browser[lang]}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Start Guide */}
        <Card>
          <CardHeader>
            <CardTitle>{TEXT.quick_start_guide_title[lang]}</CardTitle>
            <CardDescription>
              {TEXT.start_data_analysis_in_just_a_few_steps[lang]}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                    1
                  </div>
                  <h3 className="font-semibold">{TEXT.upload_files[lang]}</h3>
                </div>
                <p className="text-sm text-gray-600 ml-11">
                  {TEXT.upload_csv_excel_json_files_or_prepare_survey_statistics_tables[lang]}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                    2
                  </div>
                  <h3 className="font-semibold">{TEXT.choose_analysis[lang]}</h3>
                </div>
                <p className="text-sm text-gray-600 ml-11">
                  {TEXT.select_from_general_analysis_survey_analysis_or_ai_table_analysis[lang]}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                    3
                  </div>
                  <h3 className="font-semibold">{TEXT.view_results[lang]}</h3>
                </div>
                <p className="text-sm text-gray-600 ml-11">
                  {TEXT.check_analysis_results_and_visualizations_to_derive_insights[lang]}
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-center space-x-4">
              <Link href="/upload">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Upload className="mr-2 h-4 w-4" />
                  {TEXT.start_analysis_button[lang]}
                </Button>
              </Link>
              <Link href="/analysis">
                <Button variant="outline">
                  <Bot className="mr-2 h-4 w-4" />
                  {TEXT.try_ai_analysis_button[lang]}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Demo Section */}
        <section className="max-w-3xl mx-auto py-16 px-4">
          <h2 className="text-2xl font-bold mb-4">기능 미리보기 (인터랙티브 데모)</h2>
          <p className="mb-8 text-gray-600 dark:text-gray-300">
            클릭만으로 AI 분석과 질문 추천 등 주요 기능을 직접 체험해보세요!
          </p>
          {/* 데모 통계표 미리보기 */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">데모 통계표 미리보기</h3>
            <div className="overflow-x-auto mb-2">
              <table className="min-w-full text-sm border border-gray-200 dark:border-gray-700 rounded">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    {demoTableHeaders.map((header) => (
                      <th key={header} className="px-3 py-2 font-semibold">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {demoTableRows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <button
            className="btn-primary px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-60"
            onClick={handleDemoAnalysis}
            disabled={showDemoResult}
          >
            AI로 분석하기 (예시)
          </button>
          {showDemoResult && (
            <div className="mt-6">
              <div className="mb-6">
                <h3 className="font-semibold mb-2">통계 검정 결과 표 (예시)</h3>
                <div className="overflow-x-auto mb-2">
                  <table className="min-w-max text-sm border border-blue-200 dark:border-blue-700 rounded">
                    <thead>
                      <tr className="bg-blue-100 dark:bg-blue-800">
                        {demoStatTestHeaders.map((header) => (
                          <th key={header} className="px-3 py-2 font-semibold">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {demoStatTestRows.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-blue-50 dark:bg-blue-900'}>
                          {row.map((cell, j) => (
                            <td key={j} className="px-3 py-2">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mb-6">
                <h3 className="font-semibold mb-2">최종 분석 결과 요약 (예시)</h3>
                <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded text-blue-900 dark:text-blue-200 whitespace-pre-line">
                  {demoFinalResult}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 {TEXT.data_analysis_platform[lang]}. {TEXT.all_rights_reserved[lang]}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
