"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Brain, BarChart3, Table, Bot, Globe, Settings, CheckCircle, AlertCircle, Workflow, Save, Loader2, ListChecks, XCircle, Download, RefreshCw, StopCircle, LogIn, FileSearch } from "lucide-react";
import Link from "next/link";

import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import * as XLSX from "xlsx";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

interface SurveyData {
  questionKeys: string[];
  questionTexts: { [key: string]: string };
  tables: { [key: string]: SurveyTable };
}

interface SurveyTable {
  columns: string[];
  data: any[][];
}

// 단계별 상태 타입 정의
const ANALYSIS_STEPS = [
  { key: 'hypothesis', label: '가설 생성' },
  { key: 'testType', label: '통계 검정 방법 결정' },
  { key: 'statTest', label: '통계 분석 실행' },
  { key: 'anchor', label: 'Anchor(주요 변수) 추출' },
  { key: 'summary', label: '테이블 요약(LLM)' },
  { key: 'hallucination', label: '환각 체크/수정' },
  { key: 'polishing', label: '문장 다듬기' },
];

// 예시 분석 단계별 결과 (완전히 새로운 가상 데이터)
const EXAMPLE_ANALYSIS_STEPS = [
  { key: 'hypothesis', label: '가설 생성', status: 'done', result: '1. 직업군에 따라 재택근무 선호도가 다를 것이다.\n2. IT 업계 종사자가 재택근무에 더 긍정적일 것이다.\n3. 연령대가 낮을수록 재택근무 활용률이 높을 것이다.' },
  { key: 'testType', label: '통계 검정 방법 결정', status: 'done', result: 'chi_square' },
  { key: 'statTest', label: '통계 분석 실행', status: 'done', result: {
    type: 'chi_square',
    table: [
      { '대분류': '직업군', '통계량': 12.34, 'p-value': 0.002, '유의성': '**' },
      { '대분류': '연령대', '통계량': 3.21, 'p-value': 0.073, '유의성': '' },
      { '대분류': '성별', '통계량': 0.98, 'p-value': 0.321, '유의성': '' },
      { '대분류': '근무지역', '통계량': 7.56, 'p-value': 0.023, '유의성': '*' }
    ]
  }},
  { key: 'anchor', label: 'Anchor(주요 변수) 추출', status: 'done', result: ['재택근무 경험 있음', '재택근무 선호'] },
  { key: 'summary', label: '테이블 요약(LLM)', status: 'done', result: '직업군에 따라 재택근무 선호도에 유의미한 차이가 있었음. IT 업계에서 특히 선호도가 높았음. 연령대, 성별에 따른 차이는 통계적으로 유의하지 않았음.' },
  { key: 'hallucination', label: '환각 체크/수정', status: 'done' },
  { key: 'polishing', label: '문장 다듬기', status: 'done', result: 'IT 업계 종사자에서 재택근무 선호가 두드러졌으며, 다른 변수에서는 뚜렷한 차이가 관찰되지 않았음.' },
];

function customSort(keys: string[]) {
  return keys.slice().sort((a, b) => {
    const parse = (k: string): [string, number, number] => {
      const match = k.match(/^([A-Z]+)(\d+)?(?:_(\d+))?/);
      if (!match) return [k, 0, 0];
      return [
        match[1] || '',
        match[2] ? parseInt(match[2], 10) : 0,
        match[3] ? parseInt(match[3], 10) : 0
      ];
    };
    const [aAlpha, aNum, aSub] = parse(a);
    const [bAlpha, bNum, bSub] = parse(b);
    if (String(aAlpha) !== String(bAlpha)) return String(aAlpha).localeCompare(String(bAlpha));
    if (Number(aNum) !== Number(bNum)) return Number(aNum) - Number(bNum);
    return Number(aSub) - Number(bSub);
  });
}

export default function TableAnalysisPage() {
  const { lang } = useLanguage();
  const { user, loading: authLoading } = useAuth('/table-analysis');
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedRawDataFile, setUploadedRawDataFile] = useState<File | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [analysisType, setAnalysisType] = useState<'single' | 'batch'>('single');
  
  // 통계 검정 유무 선택 상태 추가
  const [useStatisticalTest, setUseStatisticalTest] = useState<boolean>(true);

  // 전체 분석용 임시 상태 (질문별 통계 검정 방법)
  const [batchTestTypes, setBatchTestTypes] = useState<{ [key: string]: string }>({});
  const [batchJobId, setBatchJobId] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<any[]>([]);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [isRecommendingTestTypes, setIsRecommendingTestTypes] = useState(false);

  const [jobIdInput, setJobIdInput] = useState("");
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [batchLogs, setBatchLogs] = useState<any[]>([]);

  // surveyData가 로드되면 첫번째 질문을 자동 선택
  useEffect(() => {
    if (surveyData && surveyData.questionKeys.length > 0 && !selectedQuestion) {
      setSelectedQuestion(surveyData.questionKeys[0]);
    }
  }, [surveyData, selectedQuestion]);

  // 전체 분석 모드에서 파일 업로드 후 LLM 추천 test_type 받아오기
  useEffect(() => {
    const fetchRecommendedTestTypes = async () => {
      if (analysisType === 'batch' && surveyData && uploadedFile) {
        setIsRecommendingTestTypes(true);
        try {
          const formData = new FormData();
          formData.append("file", uploadedFile);
          formData.append("analysis_type", "recommend_test_types");
          formData.append("lang", lang);
          formData.append("use_statistical_test", useStatisticalTest.toString());
          const response = await fetch("/api/table-analysis", {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          if (data.success && data.test_type_map) {
            // 통계 검정 미사용 시 모든 질문을 manual로 설정
            if (!useStatisticalTest) {
              const manualMap: { [key: string]: string } = {};
              surveyData.questionKeys.forEach((key) => {
                manualMap[key] = 'manual';
              });
              setBatchTestTypes(manualMap);
            } else {
              setBatchTestTypes(data.test_type_map);
            }
          } else {
            // fallback: 통계 검정 사용 시 ft_test, 미사용 시 manual
            const initial: { [key: string]: string } = {};
            surveyData.questionKeys.forEach((key) => {
              initial[key] = useStatisticalTest ? 'ft_test' : 'manual';
            });
            setBatchTestTypes(initial);
          }
        } catch (e) {
          // fallback: 통계 검정 사용 시 ft_test, 미사용 시 manual
          const initial: { [key: string]: string } = {};
          surveyData.questionKeys.forEach((key) => {
            initial[key] = useStatisticalTest ? 'ft_test' : 'manual';
          });
          setBatchTestTypes(initial);
        } finally {
          setIsRecommendingTestTypes(false);
        }
      }
    };
    fetchRecommendedTestTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisType, surveyData, uploadedFile, lang, useStatisticalTest]);

  const onDrop = useCallback(async (acceptedFiles: File[], type: 'table' | 'raw') => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    if (type === 'table') {
      setUploadedFile(file);
      setSurveyData(null);
      setSelectedQuestion("");
      setAnalysisResult("");
      setError("");
      setIsProcessing(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("analysis_type", "parse");
        const response = await fetch("/api/table-analysis", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "파일 처리 중 오류가 발생했습니다.");
        }
        const data = await response.json();
        setSurveyData({
          questionKeys: data.question_keys || [],
          questionTexts: data.question_texts || {},
          tables: data.tables || {}
        });
      } catch (err: any) {
        setError(err?.message || String(err));
      } finally {
        setIsProcessing(false);
      }
    } else {
      setUploadedRawDataFile(file);
    }
  }, []);

  const { getRootProps: getTableRootProps, getInputProps: getTableInputProps, isDragActive: isTableDragActive } = useDropzone({
    onDrop: (files) => onDrop(files, 'table'),
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json']
    },
    multiple: false
  });
  const { getRootProps: getRawRootProps, getInputProps: getRawInputProps, isDragActive: isRawDragActive } = useDropzone({
    onDrop: (files) => onDrop(files, 'raw'),
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const runAnalysis = async () => {
    if (!surveyData || !uploadedFile || !selectedQuestion || isProcessing) return;
    setIsProcessing(true);
    setError("");
    setAnalysisResult("");
    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
      if (uploadedRawDataFile) {
        formData.append("raw_data_file", uploadedRawDataFile);
      }
      // analysis_type을 'single'이 아닌 'analyze'로 변환해서 보냄
      formData.append("analysis_type", analysisType === "single" ? "analyze" : analysisType);
      formData.append("selected_key", selectedQuestion);
      formData.append("lang", lang);
      formData.append("user_id", user?.id || "");
      // 통계 검정 유무 파라미터 추가
      formData.append("use_statistical_test", useStatisticalTest.toString());
      const response = await fetch("/api/table-analysis", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        // 전체 결과 객체를 저장
        setAnalysisResult(result.result);
      } else {
        throw new Error(result.error || "분석 중 오류가 발생했습니다.");
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchTestTypeChange = (key: string, value: string) => {
    setBatchTestTypes((prev) => ({ ...prev, [key]: value }));
  };

  const handleAnalysisTypeChange = (type: 'single' | 'batch') => {
    setAnalysisType(type);
    setAnalysisResult("");
    setError("");
    if (type === 'batch') {
      setSelectedQuestion("");
    }
  };

  const handleRunBatchAnalysis = async () => {
    if (!surveyData || !uploadedFile || isProcessing) return;
    setIsProcessing(true);
    setError("");
    setAnalysisResult("");
    setBatchStatus([]);
    setBatchJobId(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
      if (uploadedRawDataFile) {
        formData.append("raw_data_file", uploadedRawDataFile);
      }
      formData.append("lang", lang);
      formData.append("user_id", user?.id || "");
      formData.append("batch_test_types", JSON.stringify(batchTestTypes));
      formData.append("file_name", uploadedFile.name);
      // 통계 검정 유무 파라미터 추가
      formData.append("use_statistical_test", useStatisticalTest.toString());
      // batch-analyze API 호출
      const response = await fetch("/api/batch-analyze", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (result.success && result.job_id) {
        setBatchJobId(result.job_id);
        // 폴링 시작
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(async () => {
          const statusRes = await fetch(`/api/batch-status?job_id=${result.job_id}`);
          const statusJson = await statusRes.json();
          if (statusJson.success) {
            setBatchStatus(statusJson.results || []);
            // 모든 질문이 done 또는 error면 폴링 중단
            if (
              statusJson.results &&
              statusJson.results.length > 0 &&
              statusJson.results.every((r: any) => r.status === "done" || r.status === "error")
            ) {
              clearInterval(pollingRef.current!);
              pollingRef.current = null;
              setIsProcessing(false);
            }
          }
        }, 2000);
      } else {
        throw new Error(result.error || "분석 중 오류가 발생했습니다.");
      }
    } catch (err: any) {
      setError(err?.message || String(err));
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!user || !analysisResult || !title.trim()) return;
    
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('세션이 만료되었습니다.');
      }

      const analysisData = {
        summary: analysisResult,
        timestamp: new Date().toISOString(),
        analysisMetadata: {
          analysisType: "single",
          selectedQuestion: selectedQuestion,
          totalQuestions: surveyData?.questionKeys.length || 0,
          fileName: uploadedFile?.name || 'Unknown'
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
          uploaded_file_name: uploadedFile?.name || 'Unknown file',
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 컴포넌트 언마운트 시 폴링 중단
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // 분석 취소
  const handleCancelBatch = async () => {
    if (!batchJobId) return;
    try {
      await fetch("/api/batch-cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: batchJobId })
      });
      setIsProcessing(false);
    } catch (e) { setError("취소 중 오류"); }
  };
  // 재시작
  const handleRestartBatch = async () => {
    if (!batchJobId) return;
    try {
      await fetch("/api/batch-restart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: batchJobId })
      });
      setError("");
      // 폴링 재시작
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
        const statusRes = await fetch(`/api/batch-status?job_id=${batchJobId}`);
        const statusJson = await statusRes.json();
        if (statusJson.success) {
          setBatchStatus(statusJson.results || []);
          if (
            statusJson.results &&
            statusJson.results.length > 0 &&
            statusJson.results.every((r: any) => r.status === "done" || r.status === "error")
          ) {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            setIsProcessing(false);
          }
        }
      }, 2000);
    } catch (e) { setError("재시작 중 오류"); }
  };
  // 결과 다운로드
  const handleDownloadBatch = () => {
    if (!batchJobId) return;
    window.open(`/api/batch-download?job_id=${batchJobId}`, "_blank");
  };
  // 로그 보기
  const handleShowLogs = async () => {
    if (!batchJobId) return;
    setLogModalOpen(true);
    const res = await fetch(`/api/batch-log?job_id=${batchJobId}`);
    const json = await res.json();
    setBatchLogs(json.logs || []);
  };
  // job_id로 이어서 보기
  const handleResumeJob = async () => {
    if (!jobIdInput) return;
    setBatchJobId(jobIdInput);
    setIsProcessing(true);
    setError("");
    setBatchStatus([]);
    // 폴링 시작
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      const statusRes = await fetch(`/api/batch-status?job_id=${jobIdInput}`);
      const statusJson = await statusRes.json();
      if (statusJson.success) {
        setBatchStatus(statusJson.results || []);
        if (
          statusJson.results &&
          statusJson.results.length > 0 &&
          statusJson.results.every((r: any) => r.status === "done" || r.status === "error")
        ) {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setIsProcessing(false);
        }
      }
    }, 2000);
  };

  // 단계별 결과 렌더링 함수 추가
  function renderStepwiseResult(analysisResult: any) {
    if (!analysisResult || typeof analysisResult !== 'object') return null;
    const {
      generated_hypotheses,
      test_type,
      ft_test_result,
      anchor,
      table_analysis,
      hallucination_check,
      polishing_result
    } = analysisResult;
    // 표 렌더링
    function renderStatTable(table: any) {
      if (!Array.isArray(table) || table.length === 0) return null;
      const columns = Object.keys(table[0]);
      return (
        <table className="min-w-[320px] text-xs border rounded bg-white dark:bg-gray-900 mt-2 mb-2">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-2 py-1 border text-center font-semibold">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((row, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col} className="px-2 py-1 border text-center">{row[col]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold mb-2">분석 단계별 결과</h2>
        {/* 1. 가설 생성 */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-600"><CheckCircle className="inline w-5 h-5" /></span>
            <span className="font-semibold text-base">1. 가설 생성</span>
          </div>
          {generated_hypotheses && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 text-sm whitespace-pre-wrap border mt-1">
              {generated_hypotheses}
            </div>
          )}
        </div>
        {/* 2. 통계 검정 방법 결정 */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-600"><CheckCircle className="inline w-5 h-5" /></span>
            <span className="font-semibold text-base">2. 통계 검정 방법 결정</span>
          </div>
          {test_type && (
            <div className="text-blue-700 font-bold">선택된 통계 검정 방법: <span className="underline">{test_type}</span></div>
          )}
        </div>
        {/* 3. 통계 분석 실행 */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-600"><CheckCircle className="inline w-5 h-5" /></span>
            <span className="font-semibold text-base">3. 통계 분석 실행</span>
          </div>
          {renderStatTable(ft_test_result)}
        </div>
        {/* 4. Anchor(주요 변수) 추출 */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-600"><CheckCircle className="inline w-5 h-5" /></span>
            <span className="font-semibold text-base">4. Anchor(주요 변수) 추출</span>
          </div>
          {anchor && Array.isArray(anchor) && anchor.length > 0 && (
            <div className="text-green-700 font-semibold">Anchor 컬럼: {anchor.join(', ')}</div>
          )}
        </div>
        {/* 5. 테이블 요약(LLM) */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-600"><CheckCircle className="inline w-5 h-5" /></span>
            <span className="font-semibold text-base">5. 테이블 요약(LLM)</span>
          </div>
          {table_analysis && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 text-sm whitespace-pre-wrap border mt-1">{table_analysis}</div>
          )}
        </div>
        {/* 6. 환각 체크/수정 */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-600"><CheckCircle className="inline w-5 h-5" /></span>
            <span className="font-semibold text-base">6. 환각 체크/수정</span>
          </div>
          <div className="text-green-700 font-semibold">검증 완료</div>
        </div>
        {/* 7. 문장 다듬기 */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-600"><CheckCircle className="inline w-5 h-5" /></span>
            <span className="font-semibold text-base">7. 문장 다듬기</span>
          </div>
          {polishing_result && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 text-sm whitespace-pre-wrap border mt-1">{polishing_result}</div>
          )}
        </div>
      </div>
    );
  }

  // 대시보드 저장, 엑셀, docs export 핸들러 추가
  const handleExportExcel = () => {
    if (!batchStatus.length) return;
    const wb = XLSX.utils.book_new();
    // customSort로 정렬된 순서대로 저장
    const sortedKeys = surveyData ? customSort(surveyData.questionKeys) : customSort(batchStatus.map(row => row.question_key));
    sortedKeys.forEach(key => {
      const row = batchStatus.find(r => r.question_key === key);
      if (row && row.result && Array.isArray(row.result.ft_test_result)) {
        const ws = XLSX.utils.json_to_sheet(row.result.ft_test_result);
        XLSX.utils.book_append_sheet(wb, ws, key.slice(0, 31));
      }
    });
    XLSX.writeFile(wb, "batch_analysis_results.xlsx");
  };

  const handleExportDocs = () => {
    if (!batchStatus.length) return;
    // customSort로 정렬된 순서대로 저장
    const sortedKeys = surveyData ? customSort(surveyData.questionKeys) : customSort(batchStatus.map(row => row.question_key));
    const children = sortedKeys.flatMap(key => {
      const row = batchStatus.find(r => r.question_key === key);
      return [
        new Paragraph({ text: key, heading: "Heading1" }),
        new Paragraph(row?.result?.polishing_result || ""),
        new Paragraph("")
      ];
    });
    const doc = new Document({
      sections: [{ children }]
    });
    Packer.toBlob(doc).then(blob => saveAs(blob, "batch_analysis_summaries.docx"));
  };

  const handleSaveBatchToDashboard = async () => {
    if (!batchJobId) return;
    const res = await fetch(`/api/batch-download?job_id=${batchJobId}`);
    const data = await res.json();
    // 세션 등 인증 필요시 supabase 등에서 access_token 받아와야 함
    // 아래는 예시
    // const { data: { session } } = await supabase.auth.getSession();
    await fetch('/api/survey-analyses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Batch 분석 결과 - ${batchJobId}`,
        description: '',
        analysis_result: data,
        // 기타 메타데이터
      })
    });
    alert('대시보드에 저장되었습니다!');
  };

  // 단일 분석 엑셀/Docs export 핸들러 추가
  const handleExportSingleExcel = () => {
    if (!analysisResult || typeof analysisResult !== 'object' || !selectedQuestion) return;
    const wb = XLSX.utils.book_new();
    if (analysisResult.ft_test_result && Array.isArray(analysisResult.ft_test_result)) {
      const ws = XLSX.utils.json_to_sheet(analysisResult.ft_test_result);
      XLSX.utils.book_append_sheet(wb, ws, selectedQuestion.slice(0, 31));
    }
    XLSX.writeFile(wb, `analysis_result_${selectedQuestion}.xlsx`);
  };

  const handleExportSingleDocs = () => {
    if (!analysisResult || typeof analysisResult !== 'object' || !selectedQuestion) return;
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: selectedQuestion, heading: "Heading1" }),
          new Paragraph(analysisResult.polishing_result || ""),
          new Paragraph("")
        ]
      }]
    });
    Packer.toBlob(doc).then(blob => saveAs(blob, `analysis_summary_${selectedQuestion}.docx`));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 사이드바 */}
      <aside className="min-h-screen bg-white shadow-lg flex flex-col px-6 py-8 border-r border-gray-200 sticky top-0 z-10 overflow-y-auto dark:bg-gray-950 dark:border-gray-800 w-full max-w-xs">
        <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium mb-8">← 홈으로</Link>
        <LanguageSwitcher />
        <h1 className="text-2xl font-bold mb-4 mt-6">테이블 분석</h1>
        <p className="mb-8 text-gray-700 text-base dark:text-gray-200">
          통계표 또는 Raw Data 엑셀 파일을 업로드하면 AI가 자동으로 분석을 진행합니다.
        </p>
        {/* 분석 타입 라디오 버튼 */}
        <div className="mb-6">
          <Label className="block mb-2 font-semibold">분석 모드 선택</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="analysisType"
                value="single"
                checked={analysisType === 'single'}
                onChange={() => handleAnalysisTypeChange('single')}
              />
              단일 분석
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="analysisType"
                value="batch"
                checked={analysisType === 'batch'}
                onChange={() => handleAnalysisTypeChange('batch')}
              />
              전체 분석
            </label>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            단일 분석: 질문 선택 후 해당 질문만 분석<br/>
            전체 분석: 모든 질문에 대해 일괄 분석
          </div>
        </div>
        
        {/* 통계 검정 유무 선택 */}
        <div className="mb-6">
          <Label className="block mb-2 font-semibold">통계 검정 사용 여부</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="useStatisticalTest"
                value="true"
                checked={useStatisticalTest === true}
                onChange={() => {
                  setUseStatisticalTest(true);
                  // 통계 검정 사용 시 기존 test_type 유지하거나 ft_test로 설정
                  if (surveyData && analysisType === 'batch') {
                    const updatedTypes: { [key: string]: string } = {};
                    surveyData.questionKeys.forEach((key) => {
                      updatedTypes[key] = batchTestTypes[key] === 'manual' ? 'ft_test' : batchTestTypes[key];
                    });
                    setBatchTestTypes(updatedTypes);
                  }
                }}
              />
              통계 검정 사용
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="useStatisticalTest"
                value="false"
                checked={useStatisticalTest === false}
                onChange={() => {
                  setUseStatisticalTest(false);
                  // 통계 검정 미사용 시 모든 질문을 manual로 설정
                  if (surveyData && analysisType === 'batch') {
                    const manualMap: { [key: string]: string } = {};
                    surveyData.questionKeys.forEach((key) => {
                      manualMap[key] = 'manual';
                    });
                    setBatchTestTypes(manualMap);
                  }
                }}
              />
              통계 검정 미사용
            </label>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            통계 검정 사용: Raw Data를 활용한 통계 분석 포함 (ft_test, chi_square, manual 중 선택)<br/>
            통계 검정 미사용: Manual 통계 검정만 강제 실행 (Raw Data 불필요)
          </div>
        </div>
        {/* 통계표 업로드 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              분석용 Excel 파일 업로드 (통계표)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div {...getTableRootProps()} className={`mt-2 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${isTableDragActive ? "border-blue-500 bg-blue-50 dark:bg-blue-900" : "border-gray-300 hover:border-gray-400 dark:border-gray-600"}`}>
              <input {...getTableInputProps()} />
              <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {isTableDragActive ? "여기에 파일을 드래그하거나 클릭하여 선택하세요." : "분석용 Excel 파일을 선택하세요 (최대 200MB)"}
              </p>
            </div>
            {uploadedFile && (
              <div className="mt-3 flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">{uploadedFile.name}</span>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">엑셀(.xlsx, .xls), CSV, JSON 지원</p>
          </CardContent>
        </Card>
        {/* Raw Data 업로드 - 통계 검정 사용 시에만 표시 */}
        {useStatisticalTest && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                원시 데이터 Excel 파일 업로드 (Raw DATA, DEMO 등)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div {...getRawRootProps()} className={`mt-2 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${isRawDragActive ? "border-blue-500 bg-blue-50 dark:bg-blue-900" : "border-gray-300 hover:border-gray-400 dark:border-gray-600"}`}>
                <input {...getRawInputProps()} />
                <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {isRawDragActive ? "여기에 파일을 드래그하거나 클릭하여 선택하세요." : "원시 데이터 Excel 파일을 선택하세요 (최대 200MB)"}
                </p>
              </div>
              {uploadedRawDataFile && (
                <div className="mt-3 flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">{uploadedRawDataFile.name}</span>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">엑셀(.xlsx, .xls)만 지원, DATA/DEMO 시트 포함</p>
            </CardContent>
          </Card>
        )}
        {/* 저장 */}
        {analysisResult && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Save className="mr-2 h-5 w-5" />
                {lang === "한국어" ? "결과 저장" : "Save Results"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">제목</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={lang === "한국어" ? "분석 제목을 입력하세요" : "Enter analysis title"}
                />
              </div>
              <div>
                <Label htmlFor="description">설명 (선택사항)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={lang === "한국어" ? "분석에 대한 설명을 입력하세요" : "Enter analysis description"}
                  rows={3}
                />
              </div>
              <Button 
                onClick={handleSave} 
                disabled={!title.trim() || saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {lang === "한국어" ? "저장 중..." : "Saving..."}
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {lang === "한국어" ? "저장됨" : "Saved"}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {lang === "한국어" ? "저장" : "Save"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </aside>
      {/* 메인 컨텐츠 */}
      <main className="flex-1 p-8 space-y-6">
        {/* 질문 선택/분석 UI */}
        {analysisType === 'single' && surveyData && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                {lang === "한국어" ? "분석할 질문 선택" : "Select Question to Analyze"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <Select value={selectedQuestion} onValueChange={setSelectedQuestion}>
                  <SelectTrigger className="w-full md:w-auto flex-1 min-w-0">
                    <SelectValue placeholder={lang === "한국어" ? "질문을 선택하세요" : "Select a question"} />
                  </SelectTrigger>
                  <SelectContent>
                    {surveyData.questionKeys.map((key) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex flex-col text-left">
                          <span className="font-semibold">{key}</span>
                          <span className="text-xs text-gray-500">{surveyData.questionTexts[key]}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={runAnalysis}
                  disabled={!selectedQuestion || isProcessing}
                  className="md:w-auto w-full md:w-44 flex-shrink-0"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {lang === "한국어" ? "분석 중..." : "Analyzing..."}
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      {lang === "한국어" ? "분석 시작" : "Start Analysis"}
                    </>
                  )}
                </Button>
              </div>
              {/* 선택된 질문 key/문장 표시 */}
              {selectedQuestion && (
                <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-semibold">선택된 질문: {selectedQuestion}</span>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-200 ml-6">{surveyData.questionTexts[selectedQuestion]}</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {/* 전체 분석: 질문별 통계 검정 방법 표/수정 UI */}
        {analysisType === 'batch' && surveyData && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                전체 분석 - 질문별 통계 검정 방법 선택
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                각 질문별로 AI가 자동으로 통계 검정 방법을 추천합니다. 필요하다면 직접 선택을 변경할 수 있습니다.
              </div>
              {isRecommendingTestTypes && (
                <div className="flex items-center gap-2 mb-4 text-blue-700 dark:text-blue-300">
                  <Loader2 className="animate-spin w-5 h-5" />
                  AI가 통계 검정 방식 추천 중...
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-[400px] text-xs border rounded bg-white dark:bg-gray-900">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 border text-center">질문 키</th>
                      <th className="px-2 py-1 border text-center">질문 내용</th>
                      <th className="px-2 py-1 border text-center">통계 검정 방법</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customSort(surveyData.questionKeys).map((key) => (
                      <tr key={key}>
                        <td className="px-2 py-1 border text-center font-mono">{key}</td>
                        <td className="px-2 py-1 border text-left">{surveyData.questionTexts[key]}</td>
                        <td className="px-2 py-1 border text-center">
                          <select
                            className="border rounded px-2 py-1 text-xs"
                            value={batchTestTypes[key] || 'ft_test'}
                            onChange={(e) => handleBatchTestTypeChange(key, e.target.value)}
                            disabled={isRecommendingTestTypes}
                          >
                            <option value="ft_test">ft_test</option>
                            <option value="chi_square">chi_square</option>
                            <option value="manual">manual</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button className="mt-6 w-full" onClick={handleRunBatchAnalysis} disabled={isRecommendingTestTypes}>
                전체 분석 시작
              </Button>
            </CardContent>
          </Card>
        )}
        {/* 오류 메시지 */}
        {error && (
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="flex items-center text-red-600 dark:text-red-400">
                <AlertCircle className="mr-2 h-5 w-5" />
                <span className="font-medium">오류</span>
              </div>
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}
        {/* 테이블 미리보기는 단일 분석에서만 렌더링 */}
        {analysisType === 'single' && surveyData && selectedQuestion && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Table className="mr-2 h-5 w-5" />
                {lang === "한국어" ? "테이블 미리보기" : "Table Preview"}
              </CardTitle>
              <CardDescription>
                {lang === "한국어" ? "선택된 질문의 데이터" : "Data for selected question"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const table = surveyData.tables[selectedQuestion];
                const questionText = surveyData.questionTexts[selectedQuestion];
                return (
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
                    <div className="mb-3">
                      <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                        {lang === "한국어" ? "질문 키" : "Question Key"}: {selectedQuestion}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{questionText}</p>
                    </div>
                    {table && table.data && table.data.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs text-left text-gray-700 dark:text-gray-100 dark:bg-gray-900">
                          <thead className="bg-gray-100 dark:bg-gray-800">
                            <tr>
                              {table.columns.map((col, idx) => (
                                <th key={idx} className="px-2 py-1 font-semibold dark:text-gray-100 dark:border-gray-700">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {table.data.slice(0, 10).map((row, ridx) => (
                              <tr key={ridx} className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700">
                                {row.map((cell, cidx) => (
                                  <td key={cidx} className="px-2 py-1 dark:text-gray-100 dark:border-gray-700">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {table.data.length > 10 && (
                          <p className="text-xs text-gray-500 mt-2">
                            {lang === "한국어" ? "처음 10행만 표시됨" : "Showing first 10 rows"}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {lang === "한국어" ? "데이터가 없습니다" : "No data available"}
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}
        {/* 분석 단계별 결과 UI */}
        {analysisResult && typeof analysisResult === 'object' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ListChecks className="mr-2 h-5 w-5" />
                분석 단계별 결과
              </CardTitle>
              {/* 단일 분석 export 버튼 */}
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={handleExportSingleExcel} title="엑셀로 내보내기">🟩</Button>
                <Button size="sm" variant="outline" onClick={handleExportSingleDocs} title="Docs로 내보내기">📄</Button>
              </div>
            </CardHeader>
            <CardContent>
              {renderStepwiseResult(analysisResult)}
            </CardContent>
          </Card>
        )}
        {/* 기존 텍스트/JSON 결과 fallback */}
        {analysisResult && typeof analysisResult === 'string' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ListChecks className="mr-2 h-5 w-5" />
                분석 단계별 결과
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-50 dark:bg-gray-900 rounded p-3 text-sm whitespace-pre-wrap">{analysisResult}</pre>
            </CardContent>
          </Card>
        )}
        {/* 전체 분석 결과/진행상황 테이블 UI 추가 */}
        {analysisType === 'batch' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ListChecks className="mr-2 h-5 w-5" />
                전체 분석 진행상황
              </CardTitle>
              {/* export/dash 저장 버튼 추가 */}
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={handleExportExcel} title="엑셀로 내보내기">🟩</Button>
                <Button size="sm" variant="outline" onClick={handleExportDocs} title="Docs로 내보내기">📄</Button>
                <Button size="sm" variant="outline" onClick={handleSaveBatchToDashboard} title="대시보드에 저장">💾</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-2 text-xs text-gray-500 flex items-center gap-2">
                Job ID: <span className="font-mono">{batchJobId || '-'}</span>
                <Button size="sm" variant="outline" className="ml-2" onClick={handleDownloadBatch} disabled={!batchJobId} title="결과 다운로드">
                  <Download className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleShowLogs} disabled={!batchJobId} title="로그 보기">
                  <FileSearch className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelBatch} disabled={!batchJobId || !isProcessing} title="분석 취소">
                  <StopCircle className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleRestartBatch} disabled={!batchJobId} title="재시작">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <Input
                  placeholder="job_id로 이어서 보기"
                  value={jobIdInput}
                  onChange={e => setJobIdInput(e.target.value)}
                  className="w-48 text-xs"
                />
                <Button size="sm" onClick={handleResumeJob} disabled={!jobIdInput}>
                  <LogIn className="w-4 h-4 mr-1" /> 이어서 보기
                </Button>
              </div>
              {/* 진행률 바 */}
              {batchStatus.length > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{
                      width: `${
                        (batchStatus.filter((r) => r.status === "done" || r.status === "error").length / batchStatus.length) * 100
                      }%`,
                    }}
                  ></div>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-[900px] text-xs border rounded bg-white dark:bg-gray-900">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 border text-center">질문 키</th>
                      <th className="px-2 py-1 border text-center">상태</th>
                      <th className="px-2 py-1 border text-center min-w-[300px] max-w-[600px]">결과/에러</th>
                      <th className="px-2 py-1 border text-center">업데이트 시각</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customSort(batchStatus.map(r => r.question_key)).map((key, i) => {
                      const row = batchStatus.find(r => r.question_key === key);
                      if (!row) return null;
                      return (
                        <tr key={row.question_key || i}>
                          <td className="px-2 py-1 border text-center font-mono">{row.question_key}</td>
                          <td className="px-2 py-1 border text-center">
                            {row.status === "pending" && <span className="text-gray-500">대기중</span>}
                            {row.status === "running" && <span className="text-blue-600">진행중</span>}
                            {row.status === "done" && <span className="text-green-600">완료</span>}
                            {row.status === "error" && <span className="text-red-600">에러</span>}
                          </td>
                          <td className="px-2 py-1 border text-left min-w-[300px] max-w-[600px] break-all">
                            {row.status === "done" && row.result && (
                              <details>
                                <summary className="cursor-pointer text-blue-700">결과 보기</summary>
                                {/* 통계 검정 결과 표 */}
                                {row.result.ft_test_result && Array.isArray(row.result.ft_test_result) && row.result.ft_test_result.length > 0 && (
                                  <table className="min-w-[320px] text-xs border rounded bg-white dark:bg-gray-900 mt-2 mb-2">
                                    <thead>
                                      <tr>
                                        {Object.keys(row.result.ft_test_result[0]).map((col) => (
                                          <th key={col} className="px-2 py-1 border text-center font-semibold">{col}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {row.result.ft_test_result.map((r: any, i: number) => (
                                        <tr key={i}>
                                          {Object.values(r).map((cell: any, j: number) => (
                                            <td key={j} className="px-2 py-1 border text-center">{cell}</td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                                {/* 최종 요약문 */}
                                {row.result.polishing_result && (
                                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm whitespace-pre-wrap">{row.result.polishing_result}</div>
                                )}
                              </details>
                            )}
                            {row.status === "error" && (
                              <span className="text-red-600">{row.error}</span>
                            )}
                          </td>
                          <td className="px-2 py-1 border text-center">
                            {row.updated_at ? new Date(row.updated_at).toLocaleString() : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* 로그 모달 */}
              {logModalOpen && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                  <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-md">
                    <div className="flex justify-between items-center mb-4">
                      <div className="font-bold">분석 로그</div>
                      <Button size="sm" variant="ghost" onClick={() => setLogModalOpen(false)}>닫기</Button>
                    </div>
                    <div className="max-h-64 overflow-y-auto text-xs">
                      {batchLogs.length === 0 ? (
                        <div className="text-gray-400">로그 없음</div>
                      ) : (
                        <ul className="space-y-1">
                          {batchLogs.map((log, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="font-mono text-gray-500">{log.timestamp}</span>
                              <span>{log.event}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {/* 분석 단계별 결과 UI */}
        {!uploadedFile && !analysisResult && (
          <>
            <div className="w-full">
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-6 py-4 text-center text-base font-medium w-full mb-6">
                분석을 시작하려면 <b>분석용 Excel 파일</b>을 업로드하세요.<br/>
                <span className="text-xs text-gray-500">엑셀(.xlsx, .xls), CSV, JSON 파일을 지원합니다.</span>
              </div>
            </div>
            <Card className="mb-6 w-full">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ListChecks className="mr-2 h-5 w-5" />
                  분석 단계별 결과 (예시)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-2 text-xs text-gray-500">
                  실제 분석 실행 전, 아래와 같은 단계별 결과가 제공됩니다.
                </div>
                <ol className="space-y-4">
                  {EXAMPLE_ANALYSIS_STEPS.map((step, idx) => (
                    <li key={step.key} className="">
                      <div className="flex items-center gap-2 mb-1">
                        {step.status === 'done' && <CheckCircle className="text-green-500 w-5 h-5" />}
                        <span className="font-semibold">{idx+1}. {step.label}</span>
                      </div>
                      <div className="ml-7">
                        {step.key === 'hypothesis' && step.status === 'done' && typeof step.result === 'string' && (
                          <pre className="bg-gray-50 dark:bg-gray-900 rounded p-3 text-sm whitespace-pre-wrap">{step.result}</pre>
                        )}
                        {step.key === 'testType' && step.status === 'done' && typeof step.result === 'string' && (
                          <div className="text-blue-700 dark:text-blue-300 font-bold">선택된 통계 검정 방법: {step.result}</div>
                        )}
                        {step.key === 'statTest' && step.status === 'done' &&
                          step.result && typeof step.result === 'object' && 'type' in step.result && 'table' in step.result && Array.isArray(step.result.table) && (
                            <div className="overflow-x-auto">
                              <table className="min-w-[320px] text-xs border rounded bg-white dark:bg-gray-900">
                                <thead>
                                  <tr>
                                    {step.result.type === 'ft_test' || step.result.type === 'chi_square' ? (
                                      <>
                                        <th className="px-2 py-1 border text-center">대분류</th>
                                        <th className="px-2 py-1 border text-center">통계량</th>
                                        <th className="px-2 py-1 border text-center">p-value</th>
                                        <th className="px-2 py-1 border text-center">유의성</th>
                                      </>
                                    ) : (
                                      <>
                                        <th className="px-2 py-1 border text-center">대분류</th>
                                        <th className="px-2 py-1 border text-center">평균값</th>
                                        <th className="px-2 py-1 border text-center">유의성</th>
                                        <th className="px-2 py-1 border text-center">기준평균</th>
                                        <th className="px-2 py-1 border text-center">신뢰구간</th>
                                      </>
                                    )}
                                  </tr>
                                </thead>
                                <tbody>
                                  {step.result.table.map((row: any, i: number) => (
                                    <tr key={i}>
                                      {Object.values(row).map((cell: any, j: number) => (
                                        <td key={j} className="px-2 py-1 border text-center">{cell}</td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                        )}
                        {step.key === 'anchor' && step.status === 'done' && Array.isArray(step.result) && (
                          <div className="text-green-700 dark:text-green-300">Anchor 컬럼: <span className="font-mono">{step.result.join(', ')}</span></div>
                        )}
                        {step.key === 'summary' && step.status === 'done' && typeof step.result === 'string' && (
                          <pre className="bg-gray-50 dark:bg-gray-900 rounded p-3 text-sm whitespace-pre-wrap">{step.result}</pre>
                        )}
                        {step.key === 'hallucination' && step.status === 'done' && (
                          <div className="text-green-700">검증 완료</div>
                        )}
                        {step.key === 'polishing' && step.status === 'done' && typeof step.result === 'string' && (
                          <pre className="bg-gray-50 dark:bg-gray-900 rounded p-3 text-sm whitespace-pre-wrap">{step.result}</pre>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
} 