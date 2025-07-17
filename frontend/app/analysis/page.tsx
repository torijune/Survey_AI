"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDropzone } from "react-dropzone";
import { FileText, Upload, CheckCircle, AlertCircle, BarChart3 } from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';


const TEXT = {
  title: { "한국어": "설문 분석", "English": "Survey Analysis" },
  desc: {
    "한국어": "설문 파일을 업로드하고 AI가 자동으로 분석해드립니다.",
    "English": "Upload a survey file and let AI analyze it automatically."
  },
  upload: { "한국어": "설문 파일 업로드", "English": "Upload Survey File" },
  analyze: { "한국어": "분석 시작", "English": "Start Analysis" },
  save: { "한국어": "결과 저장", "English": "Save Result" },
  saved: { "한국어": "저장 완료!", "English": "Saved!" },
  only_excel: { "한국어": "엑셀 파일(.xlsx, .xls)만 지원합니다.", "English": "Only .xlsx or .xls files are supported" },
  drag_drop: { "한국어": "여기에 파일을 드래그하거나 클릭하여 선택하세요.", "English": "Drag and drop files here, or click to select files" },
  processing: { "한국어": "파일 처리 중...", "English": "Processing file..." },
  analyzing: { "한국어": "분석 중...", "English": "Analyzing..." },
  loaded: { "한국어": "성공적으로 파일이 업로드되었습니다.", "English": "File uploaded successfully." },
  error: { "한국어": "오류 발생", "English": "Error occurred" },
  title_placeholder: { "한국어": "분석 제목을 입력하세요", "English": "Enter analysis title" },
  description_placeholder: { "한국어": "분석에 대한 설명을 입력하세요 (선택사항)", "English": "Enter description for this analysis (optional)" }
};

export default function AnalysisWorkflowPage() {
  const { lang } = useLanguage();
  const { user, loading: authLoading } = useAuth('/analysis');
  const [surveyData, setSurveyData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // 엑셀 업로드 및 파싱
  const onDropSurvey = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setIsProcessing(true);
    setError("");
    setAnalysisResult(null);
    try {
      // 파일 정보만 저장
      setSurveyData({ 
        fileName: acceptedFiles[0].name,
        file: acceptedFiles[0]
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error processing survey file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropSurvey,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const handleAnalyze = async () => {
    if (!surveyData?.file) return;
    
    setIsAnalyzing(true);
    setError("");
    try {
      // Python 백엔드 API 호출
      const formData = new FormData();
      formData.append("file", surveyData.file);
      formData.append("analysis_type", "true");
      formData.append("selected_key", "");
      formData.append("lang", lang);
      if (user?.id) {
        formData.append("user_id", user.id);
      }

      const baseUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/api/v1/single-analysis/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LangGraph API 호출 실패: ${errorText}`);
      }

      const result = await response.json();
      if (result.success) {
        setAnalysisResult({
          summary: result.result.polishing_result,
          keyFindings: result.result.anchor,
          recommendations: result.result.generated_hypotheses,
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error(result.error || "분석 중 오류가 발생했습니다.");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "분석 중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
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

      const response = await fetch('/api/survey-analyses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          uploaded_file_name: surveyData.fileName,
          analysis_result: analysisResult
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

  return (
    <div className="w-full max-w-screen-xl px-8 py-12 mx-auto dark:bg-gray-900 dark:text-gray-100">
      <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">← 홈으로</Link>
      <LanguageSwitcher />
      <h1 className="text-2xl font-bold mb-4">{TEXT.title[lang]}</h1>
      <p className="mb-8">{TEXT.desc[lang]}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 파일 업로드 및 분석 섹션 */}
        <div className="space-y-6">
          <Card className="dark:bg-gray-900 dark:border-gray-700">
            <CardHeader className="dark:bg-gray-900">
              <CardTitle className="flex items-center dark:text-gray-100">
                <Upload className="mr-2 h-5 w-5" />
                {TEXT.upload[lang]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 dark:bg-gray-900 dark:text-gray-100">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                    : 'border-gray-300 hover:border-gray-400 dark:border-gray-600'
                }`}
              >
                <input {...getInputProps()} />
                <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {isDragActive ? TEXT.drag_drop[lang] : TEXT.only_excel[lang]}
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
              
              {surveyData && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900 dark:border-green-700">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      ✅ {TEXT.loaded[lang]} ({surveyData.questionKeys.length} tables)
                    </p>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900 dark:border-red-700">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      ⚠️ {TEXT.error[lang]}
                    </p>
                  </div>
                  <p className="text-xs text-red-700 mt-1 dark:text-red-300">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {surveyData && (
            <Card className="dark:bg-gray-900 dark:border-gray-700">
              <CardHeader className="dark:bg-gray-900">
                <CardTitle className="flex items-center dark:text-gray-100">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  분석 설정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 dark:bg-gray-900 dark:text-gray-100">
                <div>
                  <label className="block text-sm font-medium mb-1">분석 제목 *</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2 dark:bg-gray-950 dark:text-gray-100 dark:border-gray-700"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={TEXT.title_placeholder[lang]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">설명 (선택사항)</label>
                  <textarea
                    className="w-full border rounded px-3 py-2 dark:bg-gray-950 dark:text-gray-100 dark:border-gray-700"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={TEXT.description_placeholder[lang]}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleAnalyze} 
                    disabled={isAnalyzing || !title.trim()} 
                    className="flex-1"
                  >
                    {isAnalyzing ? "⏳" : "🔍"} {TEXT.analyze[lang]}
                  </Button>
                  {analysisResult && (
                    <Button 
                      onClick={handleSave} 
                      disabled={saving} 
                      variant={saved ? "default" : "outline"}
                      className="px-4"
                    >
                      {saving ? "⏳" : saved ? "✅" : "💾"} {saved ? TEXT.saved[lang] : TEXT.save[lang]}
                    </Button>
                  )}
                </div>
                {isAnalyzing && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900 dark:border-blue-700">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-blue-800 dark:text-blue-200">{TEXT.analyzing[lang]}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 분석 결과 섹션 */}
        <div>
          {analysisResult && (
            <Card className="dark:bg-gray-900 dark:border-gray-700">
              <CardHeader className="dark:bg-gray-900">
                <CardTitle className="dark:text-gray-100">분석 결과</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 dark:bg-gray-900 dark:text-gray-100">
                <div>
                  <h3 className="font-semibold mb-2 dark:text-gray-100">요약</h3>
                  <p className="text-gray-700 dark:text-gray-200">{analysisResult.summary}</p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2 dark:text-gray-100">주요 발견사항</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-200">
                    {analysisResult.keyFindings.map((finding: string, index: number) => (
                      <li key={index}>{finding}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2 dark:text-gray-100">권장사항</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-200">
                    {analysisResult.recommendations.map((rec: string, index: number) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  분석 완료: {new Date(analysisResult.timestamp).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 