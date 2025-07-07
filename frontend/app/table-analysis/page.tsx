"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Brain, BarChart3, Table, Bot, Globe, Settings, CheckCircle, AlertCircle, Workflow, Save } from "lucide-react";
import Link from "next/link";


import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';

interface AnalysisPlan {
  [key: string]: {
    do_analyze: boolean;
    analysis_type: string;
  };
}

interface SurveyData {
  questionKeys: string[];
  questionTexts: { [key: string]: string };
  tables: { [key: string]: SurveyTable };
  recommendations?: { [key: string]: string };
}

interface SurveyTable {
  columns: string[];
  data: any[][];
}

export default function TableAnalysisPage() {
  const { lang } = useLanguage();
  const { user, loading: authLoading } = useAuth('/table-analysis');
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [rawDataFile, setRawDataFile] = useState<File | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string>("");
  const [analysisType, setAnalysisType] = useState<"single" | "batch">("single");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>("");
  const [analysisPlan, setAnalysisPlan] = useState<AnalysisPlan>({});
  const [analysisResult, setAnalysisResult] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [objective, setObjective] = useState<string>("");
  const [workflowProgress, setWorkflowProgress] = useState<string>("");
  const [workflowState, setWorkflowState] = useState<any>(null);
  const [showAllPlan, setShowAllPlan] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{current: number, total: number} | null>(null);
  const [singleWorkflowSteps, setSingleWorkflowSteps] = useState<string[]>([]);
  const [showWorkflowSteps, setShowWorkflowSteps] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showFtTestTable, setShowFtTestTable] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(340);
  const dragging = useRef(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [backendProgress, setBackendProgress] = useState<string>("");
  const [backendResult, setBackendResult] = useState<any>(null);
  const [backendError, setBackendError] = useState<string>("");

  const TEXT = {
    back_to_home: { "한국어": "홈으로", "English": "Back to Home" },
    page_title: { "한국어": "LangGraph 테이블 분석 에이전트", "English": "LangGraph Table Analysis Agent" },
    page_desc: { "한국어": "LangGraph 워크플로우 기반 AI 설문 데이터 분석 및 자동 보고서 생성", "English": "LangGraph workflow-based AI survey data analysis and automatic report generation" },
    openai_settings: { "한국어": "OpenAI API 설정", "English": "OpenAI API Settings" },
    api_key: { "한국어": "OpenAI API 키", "English": "OpenAI API Key" },
    not_stored: { "한국어": "API 키는 브라우저에 저장되지 않습니다.", "English": "API key is not stored in browser" },
    upload_survey: { "한국어": "설문 파일 업로드", "English": "Survey File Upload" },
    upload_raw: { "한국어": "원본 데이터 업로드", "English": "Raw Data Upload" },
    drag_drop: { "한국어": "여기에 파일을 드래그하거나 클릭하여 선택하세요.", "English": "Drag and drop files here, or click to select files" },
    only_excel: { "한국어": "엑셀 파일(.xlsx, .xls)만 지원합니다.", "English": "Only .xlsx or .xls files are supported" },
    drop_here: { "한국어": "여기에 파일을 놓으세요...", "English": "Drop the file here..." },
    processing: { "한국어": "파일 처리 중...", "English": "Processing file..." },
    analysis_type: { "한국어": "분석 유형", "English": "Analysis Type" },
    single: { "한국어": "단일 문항 분석", "English": "Single Question Analysis" },
    batch: { "한국어": "일괄 분석", "English": "Batch Analysis" },
    run_analysis: { "한국어": "LangGraph 분석 실행", "English": "Run LangGraph Analysis" },
    running: { "한국어": "LangGraph 워크플로우 실행 중...", "English": "Running LangGraph workflow..." },
    select_question: { "한국어": "문항 선택", "English": "Select Question" },
    error: { "한국어": "오류 발생", "English": "Error occurred" },
    reset: { "한국어": "초기화", "English": "Reset" },
    batch_plan_title: { "한국어": "문항별 분석 계획", "English": "Question Analysis Plan" },
    batch_plan_desc: { "한국어": "각 문항별 분석 실행 여부와 방법을 설정하세요.", "English": "Set analysis execution and method for each question" },
    auto: { "한국어": "자동", "English": "Auto" },
    ft_test: { "한국어": "F/T 검정", "English": "F/T Test" },
    chi_square: { "한국어": "카이제곱", "English": "Chi-Square" },
    manual: { "한국어": "임의 분석", "English": "Manual" },
    show_more: { "한국어": "더보기", "English": "Show more" },
    show_less: { "한국어": "간략히", "English": "Show less" },
    batch_progress: { "한국어": "진행 상황", "English": "Progress" },
    batch_progress_unit: { "한국어": "문항", "English": "questions" },
    show_steps: { "한국어": "중간 과정 보기", "English": "Show Steps" },
    hide_steps: { "한국어": "중간 과정 숨기기", "English": "Hide Steps" },
    save: { "한국어": "저장", "English": "Save" },
    saved: { "한국어": "저장 완료!", "English": "Saved!" },
    saving: { "한국어": "저장 중...", "English": "Saving..." },
    title_placeholder: { "한국어": "분석 제목을 입력하세요", "English": "Enter analysis title" },
    description_placeholder: { "한국어": "분석에 대한 설명을 입력하세요 (선택사항)", "English": "Enter description for this analysis (optional)" }
  };

  const onDropSurvey = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsProcessing(true);
    setError("");

    try {
      // Python 백엔드 API 호출로 설문 데이터 파싱
      const formData = new FormData();
      formData.append("file", file);
      
      const baseUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/api/survey-parsing`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`설문 파싱 실패: ${response.statusText}`);
      }

      const data = await response.json();
      setSurveyData(data);
      
      console.log("🔍 Debug: Survey data loaded:", {
        questionKeys: data.questionKeys,
        questionTexts: data.questionTexts,
        tables: Object.keys(data.tables)
      });
      
      if (data.questionKeys.length > 0) {
        setSelectedQuestion(data.questionKeys[0]);
        // Initialize analysis plan with rule-based recommendation
        const initialPlan: AnalysisPlan = {};
        data.questionKeys.forEach((key: string) => {
          const table = data.tables[key];
          // Python 백엔드에서 추천된 분석 방법 사용
          const recommended = data.recommendations?.[key] || "manual";
          let method = "자동";
          if (recommended === "ft_test") method = "F/T Test";
          else if (recommended === "chi_square") method = "Chi-Square";
          else if (recommended === "manual") method = "임의 분석";
          initialPlan[key] = {
            do_analyze: true,
            analysis_type: method
          };
        });
        setAnalysisPlan(initialPlan);
      } else {
        setError("No questions found in the survey file. Please check the file format.");
      }
    } catch (err) {
      console.error("Survey file processing error:", err);
      setError(err instanceof Error ? err.message : "Error processing survey file.");
    } finally {
      setIsProcessing(false);
      setAnalysisResult("");
      setSingleWorkflowSteps([]);
      setWorkflowState(null);
      setWorkflowProgress("");
    }
  }, []);

  const onDropRaw = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setRawDataFile(acceptedFiles[0]);
  }, []);

  const { getRootProps: getSurveyDropProps, getInputProps: getSurveyInputProps, isDragActive: isSurveyDragActive } = useDropzone({
    onDrop: onDropSurvey,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const { getRootProps: getRawDropProps, getInputProps: getRawInputProps, isDragActive: isRawDragActive } = useDropzone({
    onDrop: onDropRaw,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json']
    },
    multiple: false
  });

  const handleAnalysisPlanChange = (key: string, field: 'do_analyze' | 'analysis_type', value: any) => {
    setAnalysisPlan(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  const runAnalysis = async () => {
    if (!surveyData || isProcessing) return;
    setIsProcessing(true);
    setError("");
    setAnalysisResult("");
    setWorkflowState(null);
    setSingleWorkflowSteps([]);
    setShowWorkflowSteps(false);
    try {
      // Python 백엔드 API 호출
      const formData = new FormData();
      // surveyData에서 파일 정보를 가져와야 함
      // 현재 구조상 파일이 별도로 저장되어 있지 않으므로 
      // 실제 파일 업로드 시점에 파일을 저장해야 함
      throw new Error("파일 업로드 구조를 수정해야 합니다.");

      const baseUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/api/langgraph`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LangGraph API 호출 실패: ${errorText}`);
      }

      const result = await response.json();
      if (result.success) {
        setAnalysisResult(result.result.polishing_result || "");
        setWorkflowState(result.result);
      } else {
        throw new Error(result.error || "분석 중 오류가 발생했습니다.");
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSave = async () => {
    if (!user || !analysisResult || !title.trim()) return;
    
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('세션이 만료되었습니다.');
      }

      // 분석 결과를 파싱하여 구조화된 데이터로 변환
      const analysisData = {
        summary: analysisResult, // 전체 분석 결과를 저장
        keyFindings: analysisResult.includes('주요 발견사항') ? 
          analysisResult.split('주요 발견사항')[1]?.split('권장사항')[0]?.trim().split('\n').filter(line => line.trim()) : [],
        recommendations: analysisResult.includes('권장사항') ? 
          analysisResult.split('권장사항')[1]?.trim().split('\n').filter(line => line.trim()) : [],
        timestamp: new Date().toISOString(),
        // 중간 과정 데이터 추가
        workflowSteps: singleWorkflowSteps,
        statisticalResults: workflowState?.ft_test_result ? {
          testType: workflowState.test_type || 'ft_test',
          questionKey: workflowState.selected_key,
          results: workflowState.ft_test_result,
          summary: workflowState.ft_test_summary,
          error: workflowState.ft_error
        } : null,
        analysisMetadata: {
          analysisType: analysisType,
          selectedQuestion: selectedQuestion,
          totalQuestions: surveyData?.questionKeys.length || 0,
          fileNames: {
            surveyFile: 'Survey Data',
            rawDataFile: rawDataFile?.name || 'Unknown'
          }
        }
      };

      const response = await fetch('/api/survey-analyses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          uploaded_file_name: rawDataFile?.name || 'Unknown file',
          analysis_result: analysisData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '저장 중 오류가 발생했습니다.');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('저장 오류:', error);
      setError(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleBatchSave = async () => {
    if (!user || !analysisResult || !title.trim()) return;
    
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('세션이 만료되었습니다.');
      }

      // 일괄 분석 결과를 파싱하여 구조화된 데이터로 변환
      const analysisData = {
        summary: analysisResult, // 전체 분석 결과를 저장
        keyFindings: analysisResult.includes('주요 발견사항') ? 
          analysisResult.split('주요 발견사항')[1]?.split('권장사항')[0]?.trim().split('\n').filter(line => line.trim()) : [],
        recommendations: analysisResult.includes('권장사항') ? 
          analysisResult.split('권장사항')[1]?.trim().split('\n').filter(line => line.trim()) : [],
        timestamp: new Date().toISOString(),
        batchInfo: {
          totalQuestions: surveyData?.questionKeys.length || 0,
          analyzedQuestions: Object.keys(analysisPlan).filter(key => analysisPlan[key]?.do_analyze).length,
          analysisTypes: Object.values(analysisPlan).map(plan => plan.analysis_type)
        },
        // 중간 과정 데이터 추가
        workflowSteps: singleWorkflowSteps,
        analysisMetadata: {
          analysisType: analysisType,
          totalQuestions: surveyData?.questionKeys.length || 0,
          fileNames: {
            surveyFile: 'Survey Data',
            rawDataFile: rawDataFile?.name || 'Unknown'
          },
          batchProgress: batchProgress
        }
      };

      const response = await fetch('/api/survey-analyses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          uploaded_file_name: rawDataFile?.name || 'Unknown file',
          analysis_result: analysisData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '저장 중 오류가 발생했습니다.');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('저장 오류:', error);
      setError(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuestionChange = (value: string) => {
    setSelectedQuestion(value);
    setAnalysisResult("");
    setSingleWorkflowSteps([]);
    setWorkflowState(null);
    setWorkflowProgress("");
    setError("");
  };

  const handleAnalysisTypeChange = (type: "single" | "batch") => {
    setAnalysisType(type);
    setAnalysisResult("");
    setSingleWorkflowSteps([]);
    setWorkflowState(null);
    setWorkflowProgress("");
    setError("");
  };

  // 드래그 핸들러
  const handleDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    dragging.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!dragging.current) return;
      const dx = moveEvent.clientX - startX;
      let newWidth = startWidth + dx;
      newWidth = Math.max(240, Math.min(600, newWidth));
      setSidebarWidth(newWidth);
    };
    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-row dark:bg-gray-900 dark:text-gray-100">
      {/* 사이드바 */}
      <aside
        className="min-h-screen bg-white shadow-lg flex flex-col px-6 py-8 border-r border-gray-200 sticky top-0 z-10 overflow-y-auto dark:bg-gray-950 dark:border-gray-800"
        style={{ width: sidebarWidth, minWidth: 240, maxWidth: 600, transition: dragging.current ? 'none' : 'width 0.2s' }}
      >
        <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium mb-8">← {TEXT.back_to_home[lang]}</Link>
        <LanguageSwitcher />
        <h1 className="text-2xl font-bold mb-4 mt-6">{TEXT.page_title[lang]}</h1>
        <p className="mb-8 text-gray-700 text-base">{TEXT.page_desc[lang]}</p>

        {authLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">인증 확인 중...</span>
          </div>
        ) : (
          <>
            {/* 설문 파일 업로드 카드 */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="mr-2 h-5 w-5" />
                  {TEXT.upload_survey[lang]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label className="text-sm font-medium">{TEXT.upload_survey[lang]}</Label>
                <div
                  {...getSurveyDropProps()}
                  className={`mt-2 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    isSurveyDragActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input {...getSurveyInputProps()} />
                  <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    {isSurveyDragActive ? TEXT.drag_drop[lang] : TEXT.only_excel[lang]}
                  </p>
                </div>
                {isProcessing && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900 dark:border-blue-700">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-blue-800 dark:text-blue-200">{TEXT.processing[lang]}</p>
                    </div>
                  </div>
                )}
                {surveyData && surveyData.questionKeys.length > 0 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900 dark:border-green-700">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        ✅ Successfully loaded {surveyData.questionKeys.length} questions
                      </p>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      Tables are ready for analysis. You can now proceed with the analysis workflow.
                    </p>
                  </div>
                )}
                {surveyData && surveyData.questionKeys.length === 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900 dark:border-red-700">
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        ⚠️ No questions found in the uploaded file
                      </p>
                    </div>
                    <p className="text-xs text-red-700 mt-1">
                      Please check the file format and ensure question keys are in the first column.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* 원본 데이터 업로드 카드 */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="mr-2 h-5 w-5" />
                  {TEXT.upload_raw[lang]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label className="text-sm font-medium">{TEXT.upload_raw[lang]}</Label>
                <div
                  {...getRawDropProps()}
                  className={`mt-2 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    isRawDragActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input {...getRawInputProps()} />
                  <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    {isRawDragActive ? TEXT.drag_drop[lang] : TEXT.only_excel[lang]}
                  </p>
                </div>
                {rawDataFile && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900 dark:border-green-700">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        {rawDataFile.name} uploaded
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </aside>
      {/* 드래그 핸들 */}
      <div
        style={{ width: 8, cursor: 'col-resize', zIndex: 30, userSelect: 'none' }}
        className="flex-shrink-0 h-screen bg-transparent hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
        onMouseDown={handleDrag}
        role="separator"
        aria-orientation="vertical"
        tabIndex={-1}
      />
      {/* 메인 분석/시각화 영역 */}
      <main className="flex-1 flex flex-col px-12 py-10 min-h-screen dark:bg-gray-900 dark:text-gray-100">
        {/* 분석 유형 선택 (단일/일괄) */}
        {surveyData && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{TEXT.analysis_type[lang]}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="analysisType"
                    value="single"
                    checked={analysisType === "single"}
                    onChange={() => handleAnalysisTypeChange("single")}
                    className="h-4 w-4 text-blue-600 border-gray-300"
                  />
                  {TEXT.single[lang]}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="analysisType"
                    value="batch"
                    checked={analysisType === "batch"}
                    onChange={() => handleAnalysisTypeChange("batch")}
                    className="h-4 w-4 text-blue-600 border-gray-300"
                  />
                  {TEXT.batch[lang]}
                </label>
              </div>
            </CardContent>
          </Card>
        )}
        {/* 문항 선택 (단일 분석) */}
        {surveyData && analysisType === "single" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{TEXT.select_question[lang]}</CardTitle>
              <CardDescription>
                Available questions: {surveyData.questionKeys.join(', ')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedQuestion} onValueChange={handleQuestionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a question to analyze" />
                </SelectTrigger>
                <SelectContent>
                  {surveyData.questionKeys.map((key) => (
                    <SelectItem key={key} value={key}>
                      <div>
                        <div className="font-medium">{key}</div>
                        <div className="text-sm text-gray-500 truncate">
                          {surveyData.questionTexts[key]}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}
        {/* 분석 실행 버튼 */}
        {surveyData && rawDataFile && (
          <Button 
            onClick={runAnalysis}
            disabled={isProcessing}
            className="w-full mb-6 text-white bg-blue-600 hover:bg-blue-700 shadow-md border border-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 dark:text-white dark:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
            size="lg"
          >
            <Workflow className="mr-2 h-5 w-5" />
            {isProcessing ? TEXT.running[lang] : TEXT.run_analysis[lang]}
          </Button>
        )}

        {/* 분석 진행 상황 표시 */}
        {isProcessing && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                {TEXT.running[lang]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm font-medium text-blue-600">
                  {workflowProgress}
                </div>
                {singleWorkflowSteps.length > 0 && (
                  <div className="bg-gray-50 border rounded p-3 text-xs font-mono whitespace-pre-line max-h-32 overflow-y-auto">
                    {singleWorkflowSteps.map((step, idx) => (
                      <div key={idx} className="mb-1">
                        <span className="text-blue-600">[{idx + 1}]</span> {step}
                      </div>
                    ))}
                  </div>
                )}
                {batchProgress && batchProgress.total > 0 && (
                  <div className="space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-700 text-center">
                      {TEXT.batch_progress[lang]}: {batchProgress.current} / {batchProgress.total} {TEXT.batch_progress_unit[lang]}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 실시간 통계 분석 결과 (분석 중에도 표시) */}
        {isProcessing && workflowState?.ft_test_result && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                📊 실시간 통계 분석 결과
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900 dark:border-yellow-700">
                <div className="text-sm text-yellow-700 mb-3 dark:text-yellow-200">
                  <p>• 분석 유형: {workflowState.test_type || 'ft_test'}</p>
                  <p>• 분석된 질문: {workflowState.selected_key}</p>
                  {workflowState.ft_test_summary && (
                    <p>• 요약: {workflowState.ft_test_summary}</p>
                  )}
                </div>
                
                {/* F/T 검정 결과 테이블 */}
                {(() => {
                  let ftTestRows = Array.isArray(workflowState.ft_test_result)
                    ? workflowState.ft_test_result
                    : (workflowState.ft_test_result ? Object.values(workflowState.ft_test_result) : []);
                  
                  return ftTestRows.length > 0 ? (
                    <div className="overflow-x-auto border rounded-lg bg-white p-4 shadow-sm">
                      <table className="min-w-full text-xs text-left text-gray-700 dark:text-gray-100 dark:bg-gray-900">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                          <tr>
                            <th className="px-3 py-2 font-semibold dark:text-gray-100 dark:border-gray-700">대분류</th>
                            <th className="px-3 py-2 font-semibold dark:text-gray-100 dark:border-gray-700">통계량</th>
                            <th className="px-3 py-2 font-semibold dark:text-gray-100 dark:border-gray-700">p-value</th>
                            <th className="px-3 py-2 font-semibold dark:text-gray-100 dark:border-gray-700">유의성</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ftTestRows.map((row: any, idx: number) => (
                            <tr key={idx} className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700">
                              <td className="px-3 py-2 font-medium dark:text-gray-100 dark:border-gray-700">{row["대분류"] || ""}</td>
                              <td className="px-3 py-2 dark:text-gray-100 dark:border-gray-700">{isNaN(row["통계량"]) ? "" : row["통계량"]}</td>
                              <td className="px-3 py-2 dark:text-gray-100 dark:border-gray-700">{isNaN(row["p-value"]) ? "" : row["p-value"]}</td>
                              <td className="px-3 py-2 dark:text-gray-100 dark:border-gray-700">
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
                  ) : (
                    <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded">
                      통계 분석 결과가 없습니다.
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        )}
        {/* Table Preview (단일 분석) */}
        {surveyData && analysisType === "single" && selectedQuestion && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Table className="mr-2 h-5 w-5" />
                Table Preview
              </CardTitle>
              <CardDescription>
                Preview of the selected question&apos;s table (all rows)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const table = surveyData.tables[selectedQuestion];
                const questionText = surveyData.questionTexts[selectedQuestion];
                return (
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
                    <div className="mb-3">
                      <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100">Question Key: {selectedQuestion}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{questionText}</p>
                    </div>
                    {table && table.data && table.data.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs text-left text-gray-700 dark:text-gray-100 dark:bg-gray-900">
                          <thead className="bg-gray-100 dark:bg-gray-800">
                            <tr>
                              {table.columns.map((col, idx) => (
                                <th key={idx} className="px-2 py-1 font-semibold dark:text-gray-100 dark:border-gray-700">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {table.data.map((row, ridx) => (
                              <tr key={ridx} className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700">
                                {row.map((cell, cidx) => (
                                  <td key={cidx} className="px-2 py-1 dark:text-gray-100 dark:border-gray-700">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 dark:text-gray-500">No data available</div>
                    )}
                  </div>
                );
              })()}
              <div className="bg-yellow-50 dark:bg-yellow-900 p-3 rounded-lg mt-4 border border-yellow-200 dark:border-yellow-700">
                <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">🔍 Key Normalization Info</p>
                <div className="text-xs text-yellow-700 dark:text-yellow-200 space-y-1">
                  <p>• Original keys are normalized (spaces, hyphens, underscores removed)</p>
                  <p>• Keys are converted to uppercase for matching</p>
                  <p>• Partial and similarity matching is used for key lookup</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {/* 분석 결과 & 중간 과정 */}
        {analysisResult && (
          (() => {
            // 로깅 추가
            console.log("workflowState", workflowState);
            console.log("ft_test_result", workflowState?.ft_test_result);
            return (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5" />
                    Analysis Result
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* 저장 설정 */}
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900 dark:border-blue-700">
                    <h4 className="font-medium text-blue-800 mb-3">💾 분석 결과 저장</h4>
                    {analysisType === "batch" && (
                      <div className="mb-3 p-2 bg-blue-100 border border-blue-300 rounded">
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                          📊 <strong>일괄 분석 모드</strong><br/>
                          • 총 문항: {surveyData?.questionKeys.length || 0}개<br/>
                          • 분석 대상: {Object.keys(analysisPlan).filter(key => analysisPlan[key]?.do_analyze).length}개<br/>
                          • 분석 유형: {Object.values(analysisPlan).filter(plan => plan.do_analyze).map(plan => plan.analysis_type).join(', ')}
                        </p>
                      </div>
                    )}
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-blue-700">제목 *</Label>
                        <Input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder={TEXT.title_placeholder[lang]}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-blue-700">설명 (선택사항)</Label>
                        <Textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder={TEXT.description_placeholder[lang]}
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                      <Button 
                        onClick={analysisType === "batch" ? handleBatchSave : handleSave} 
                        disabled={saving || !title.trim()}
                        className="w-full"
                        variant={saved ? "default" : "outline"}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? TEXT.saving[lang] : saved ? TEXT.saved[lang] : TEXT.save[lang]}
                      </Button>
                    </div>
                  </div>

                  {/* 통계 분석 결과 섹션 */}
                  {analysisType === "single" && workflowState?.ft_test_result && (
                    <div className="mb-6">
                      <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900 dark:border-green-700">
                        <h4 className="font-medium text-green-800 mb-3 flex items-center">
                          <BarChart3 className="mr-2 h-4 w-4" />
                          📊 통계 분석 결과
                        </h4>
                        <div className="text-sm text-green-700 mb-3">
                          <p>• 분석 유형: {workflowState.test_type || 'ft_test'}</p>
                          <p>• 분석된 질문: {workflowState.selected_key}</p>
                          {workflowState.ft_test_summary && (
                            <p>• 요약: {workflowState.ft_test_summary}</p>
                          )}
                        </div>
                        
                        {/* F/T 검정 결과 테이블 */}
                        {(() => {
                          // ft_test_result가 배열이 아니면 배열로 변환
                          let ftTestRows = Array.isArray(workflowState.ft_test_result)
                            ? workflowState.ft_test_result
                            : (workflowState.ft_test_result ? Object.values(workflowState.ft_test_result) : []);
                          
                          return ftTestRows.length > 0 ? (
                            <div className="overflow-x-auto border rounded-lg bg-white p-4 shadow-sm">
                              <table className="min-w-full text-xs text-left text-gray-700 dark:text-gray-100 dark:bg-gray-900">
                                <thead className="bg-gray-100 dark:bg-gray-800">
                                  <tr>
                                    <th className="px-3 py-2 font-semibold dark:text-gray-100 dark:border-gray-700">대분류</th>
                                    <th className="px-3 py-2 font-semibold dark:text-gray-100 dark:border-gray-700">통계량</th>
                                    <th className="px-3 py-2 font-semibold dark:text-gray-100 dark:border-gray-700">p-value</th>
                                    <th className="px-3 py-2 font-semibold dark:text-gray-100 dark:border-gray-700">유의성</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ftTestRows.map((row: any, idx: number) => (
                                    <tr key={idx} className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700">
                                      <td className="px-3 py-2 font-medium dark:text-gray-100 dark:border-gray-700">{row["대분류"] || ""}</td>
                                      <td className="px-3 py-2 dark:text-gray-100 dark:border-gray-700">{isNaN(row["통계량"]) ? "" : row["통계량"]}</td>
                                      <td className="px-3 py-2 dark:text-gray-100 dark:border-gray-700">{isNaN(row["p-value"]) ? "" : row["p-value"]}</td>
                                      <td className="px-3 py-2 dark:text-gray-100 dark:border-gray-700">
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
                          ) : (
                            <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded">
                              통계 분석 결과가 없습니다.
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* 최종 분석 결과 */}
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                      <FileText className="mr-2 h-4 w-4" />
                      📝 최종 분석 요약
                    </h4>
                    <Textarea
                      value={analysisResult}
                      readOnly
                      className="min-h-[300px] font-mono text-sm"
                    />
                  </div>

                  {/* 워크플로우 진행 상황 */}
                  {analysisType === "single" && singleWorkflowSteps.length > 0 && (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowWorkflowSteps(v => !v)}
                        className="mb-2"
                      >
                        {showWorkflowSteps ? TEXT.hide_steps[lang] : TEXT.show_steps[lang]}
                      </Button>
                      {showWorkflowSteps && (
                        <div className="bg-gray-50 border rounded p-3 text-xs font-mono whitespace-pre-line max-h-64 overflow-y-auto">
                          {singleWorkflowSteps.map((step, idx) => (
                            <div key={idx} className="mb-1">
                              <span className="text-blue-600">[{idx + 1}]</span> {step}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()
        )}
        {/* 일괄 분석 계획 (batch) */}
        {surveyData && analysisType === "batch" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{TEXT.batch_plan_title[lang]}</CardTitle>
              <CardDescription>
                {TEXT.batch_plan_desc[lang]}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(showAllPlan ? surveyData.questionKeys : surveyData.questionKeys.slice(0, 5)).map((key) => {
                  // Determine the recommended method for this question
                  const table = surveyData.tables[key];
                  // Python 백엔드에서 추천된 분석 방법 사용
                  const recommended = surveyData.recommendations?.[key] || "manual";
                  // Map to dropdown value
                  let recommendedValue = "F/T Test";
                  if (recommended === "chi_square") recommendedValue = "Chi-Square";
                  else if (recommended === "manual") recommendedValue = "임의 분석";
                  // For English, map "임의 분석" to "Manual"
                  const manualValue = lang === "한국어" ? "임의 분석" : "Manual";
                  // For display, append (AI 추천) or (AI Recommended) to the recommended option
                  const aiTag = lang === "한국어" ? " (AI 추천)" : " (AI Recommended)";
                  return (
                    <div key={key} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <input
                        type="checkbox"
                        checked={analysisPlan[key]?.do_analyze || false}
                        onChange={(e) => handleAnalysisPlanChange(key, 'do_analyze', e.target.checked)}
                        className="text-blue-600 h-5 w-5 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{key}</p>
                        <p className="text-sm text-gray-600">{surveyData.questionTexts[key]}</p>
                      </div>
                      <Select
                        value={analysisPlan[key]?.analysis_type || ""}
                        onValueChange={(value) => handleAnalysisPlanChange(key, 'analysis_type', value)}
                        disabled={!analysisPlan[key]?.do_analyze}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="F/T Test">{recommendedValue === "F/T Test" ? TEXT.ft_test[lang] + aiTag : TEXT.ft_test[lang]}</SelectItem>
                          <SelectItem value="Chi-Square">{recommendedValue === "Chi-Square" ? TEXT.chi_square[lang] + aiTag : TEXT.chi_square[lang]}</SelectItem>
                          <SelectItem value={manualValue}>{recommendedValue === manualValue ? TEXT.manual[lang] + aiTag : TEXT.manual[lang]}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
                {surveyData.questionKeys.length > 5 && (
                  <button
                    type="button"
                    className="mt-2 text-blue-600 hover:underline text-sm"
                    onClick={() => setShowAllPlan((v) => !v)}
                  >
                    {showAllPlan ? TEXT.show_less[lang] : TEXT.show_more[lang]}
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
} 