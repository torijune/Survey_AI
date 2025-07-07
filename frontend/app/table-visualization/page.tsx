"use client";

import React, { useState, useRef } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FileText, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { SurveyProcessor, SurveyTable } from "@/lib/analysis/surveyProcessor";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, CartesianGrid
} from 'recharts';
import Link from "next/link";
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';

// Mock table columns and data
const mockColumns = [
  { key: "age", label: { "한국어": "연령대", "English": "Age Group" } },
  { key: "gender", label: { "한국어": "성별", "English": "Gender" } },
  { key: "satisfaction", label: { "한국어": "만족도", "English": "Satisfaction" } },
  { key: "usage", label: { "한국어": "이용 빈도", "English": "Usage Frequency" } },
];

const TEXT = {
  title: { "한국어": "테이블 시각화", "English": "Table Visualization" },
  desc: {
    "한국어": "설문 파일을 업로드하고, 질문(컬럼)을 선택하면 다양한 시각화 예시를 확인하고 원하는 차트를 저장할 수 있습니다.",
    "English": "Upload a survey file, select a question (column) to see various visualization previews and save your preferred chart."
  },
  upload: { "한국어": "설문 파일 업로드", "English": "Upload Survey File" },
  select_table: { "한국어": "테이블 선택", "English": "Select Table" },
  select_question: { "한국어": "질문(컬럼) 선택", "English": "Select Question (Column)" },
  save: { "한국어": "저장", "English": "Save" },
  saved: { "한국어": "저장 완료!", "English": "Saved!" },
  preview: { "한국어": "시각화 미리보기", "English": "Visualization Preview" },
  choose: { "한국어": "원하는 시각화를 선택하세요.", "English": "Choose your preferred visualization." },
  no_table: { "한국어": "업로드된 테이블이 없습니다.", "English": "No table uploaded." },
  only_excel: { "한국어": "엑셀 파일(.xlsx, .xls)만 지원합니다.", "English": "Only .xlsx or .xls files are supported" },
  drag_drop: { "한국어": "여기에 파일을 드래그하거나 클릭하여 선택하세요.", "English": "Drag and drop files here, or click to select files" },
  processing: { "한국어": "파일 처리 중...", "English": "Processing file..." },
  loaded: { "한국어": "성공적으로 파일이 업로드되었습니다.", "English": "File uploaded successfully." },
  error: { "한국어": "오류 발생", "English": "Error occurred" },
  title_placeholder: { "한국어": "시각화 제목을 입력하세요", "English": "Enter visualization title" },
  description_placeholder: { "한국어": "시각화에 대한 설명을 입력하세요 (선택사항)", "English": "Enter description for this visualization (optional)" }
};

const chartTypes = [
  { key: "bar", label: { "한국어": "막대 차트", "English": "Bar Chart" } },
  { key: "pie", label: { "한국어": "원형 차트", "English": "Pie Chart" } },
  { key: "line", label: { "한국어": "선형 차트", "English": "Line Chart" } },
];

// Excel-like color palette
const EXCEL_COLORS = [
  '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47', '#264478', '#9E480E', '#636363', '#997300', '#255E91', '#43682B'
];

export default function TableVisualizationPage() {
  const { lang } = useLanguage();
  const { user, loading: authLoading } = useAuth('/table-visualization');
  const [surveyData, setSurveyData] = useState<{ tables: { [key: string]: SurveyTable }, questionKeys: string[], fileName?: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>("");
  const [selectedTableKey, setSelectedTableKey] = useState<string>("");
  const [selectedChart, setSelectedChart] = useState<string>("bar");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(340);
  const dragging = useRef(false);

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

  // 엑셀 업로드 및 파싱
  const onDropSurvey = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setIsProcessing(true);
    setError("");
    setSaved(false);
    try {
      const processor = new SurveyProcessor();
      const data = await processor.loadSurveyTables(acceptedFiles[0]);
      setSurveyData({ ...data, fileName: acceptedFiles[0].name });
      setSelectedTableKey(data.questionKeys[0] || "");
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

  // 현재 선택된 테이블
  const currentTable = surveyData && selectedTableKey ? surveyData.tables[selectedTableKey] : null;

  const handleSave = async () => {
    if (!user || !surveyData || !title.trim() || !currentTable) return;
    
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('세션이 만료되었습니다.');
      }

      const response = await fetch('/api/survey-visualizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          uploaded_file_name: surveyData.fileName,
          selected_table_key: selectedTableKey,
          selected_chart_type: selectedChart,
          chart_data: chartData,
          chart_config: {
            chartType: selectedChart,
            colors: EXCEL_COLORS,
            tableKey: selectedTableKey
          }
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

  // 선택된 질문의 "전체" 행에서 사례수 제외 컬럼 추출 (공백 포함, 평균(n점척도) 제외)
  let chartData: { name: string, value: number }[] = [];
  if (currentTable) {
    const 전체행 = currentTable.data.find(row => (row[0] || '').replace(/\s/g, '') === "전체");
    if (전체행) {
      // 정규식: 평균(숫자점척도) 또는 평균 (숫자 점 척도) 등 띄어쓰기 허용
      const meanPattern = /^평균\s*\(\s*\d+\s*점\s*척도\s*\)$/;
      chartData = currentTable.columns
        .map((col, idx) => ({ col, idx }))
        .filter(({ col }) => col !== "대분류" && col !== "소분류" && col !== "사례수" && !meanPattern.test(col.replace(/\s/g, '')))
        .map(({ col, idx }) => ({ name: col, value: Number(전체행[idx]) }))
        .filter(d => !isNaN(d.value));
    }
  }

  if (authLoading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center dark:bg-gray-900 dark:text-gray-100">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">인증 확인 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-row dark:bg-gray-900 dark:text-gray-100">
      {/* 사이드바 */}
      <aside
        className="min-h-screen bg-white shadow-lg flex flex-col px-6 py-8 border-r border-gray-200 sticky top-0 z-10 overflow-y-auto dark:bg-gray-950 dark:border-gray-800"
        style={{ width: sidebarWidth, minWidth: 240, maxWidth: 600, transition: dragging.current ? 'none' : 'width 0.2s' }}
      >
        <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium mb-8">← 홈으로</Link>
        <LanguageSwitcher />
        <h1 className="text-2xl font-bold mb-4 mt-6">{TEXT.title[lang]}</h1>
        <p className="mb-8 text-gray-700 text-base dark:text-gray-200">{TEXT.desc[lang]}</p>
        {/* 엑셀 파일 업로드 카드 */}
        <Card className="dark:bg-gray-900 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="mr-2 h-5 w-5" />
              {TEXT.upload[lang]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label className="text-sm font-medium">{TEXT.upload[lang]}</Label>
            <div
              {...getRootProps()}
              className={`mt-2 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
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
            {surveyData && surveyData.questionKeys.length > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900 dark:border-green-700">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-300 mr-2" />
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    ✅ {TEXT.loaded[lang]} ({surveyData.questionKeys.length} tables)
                  </p>
                </div>
                {surveyData.fileName && (
                  <div className="mt-2 p-2 bg-white border border-green-300 rounded dark:bg-gray-900 dark:border-green-700">
                    <p className="text-xs font-medium text-green-800 dark:text-green-200 mb-1">📁 업로드된 파일</p>
                    <p className="text-xs text-green-700 dark:text-green-200 break-all">{surveyData.fileName}</p>
                  </div>
                )}
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900 dark:border-red-700">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    ⚠️ {TEXT.error[lang]}: {error}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 저장 설정 카드 */}
        {surveyData && (
          <Card className="mt-4 dark:bg-gray-900 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-sm">저장 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs font-medium">제목 *</Label>
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1 text-sm mt-1 bg-white text-gray-900 placeholder-gray-400 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:border-gray-700"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={TEXT.title_placeholder[lang]}
                />
              </div>
              <div>
                <Label className="text-xs font-medium">설명 (선택사항)</Label>
                <textarea
                  className="w-full border rounded px-2 py-1 text-sm mt-1 bg-white text-gray-900 placeholder-gray-400 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:border-gray-700"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={TEXT.description_placeholder[lang]}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </aside>
      {/* 드래그 핸들 */}
      <div
        style={{ width: 8, cursor: 'col-resize', zIndex: 30, userSelect: 'none' }}
        className="flex-shrink-0 h-screen bg-transparent hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors"
        onMouseDown={handleDrag}
        role="separator"
        aria-orientation="vertical"
        tabIndex={-1}
      />
      {/* 메인 시각화 영역 */}
      <main className="flex-1 flex flex-col px-12 py-10 min-h-screen dark:bg-gray-900 dark:text-gray-100">
        <h1 className="text-3xl font-bold mb-2 block md:hidden">{TEXT.title[lang]}</h1>
        <p className="mb-8 text-gray-700 text-lg block md:hidden">{TEXT.desc[lang]}</p>
        {/* 테이블 선택 */}
        {surveyData && surveyData.questionKeys.length > 0 && (
          <div className="mb-6">
            <label className="block font-medium mb-1 text-gray-900 dark:text-gray-200">{TEXT.select_table[lang]}</label>
            <select
              className="w-full border rounded px-3 py-2 bg-white text-gray-900 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:border-gray-700"
              value={selectedTableKey}
              onChange={e => {
                setSelectedTableKey(e.target.value);
              }}
            >
              {surveyData.questionKeys.map(key => {
                const table = surveyData.tables[key];
                const question = table?.questionText || key;
                const shortQuestion = question.length > 50 ? question.substring(0, 50) + '...' : question;
                return (
                  <option key={key} value={key} className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100">
                    {key} - {shortQuestion}
                  </option>
                );
              })}
            </select>
            {currentTable && currentTable.questionText && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                <strong>선택된 질문:</strong> {currentTable.questionText}
              </p>
            )}
          </div>
        )}
        {/* 시각화 */}
        {surveyData && surveyData.questionKeys.length > 0 ? (
          <>
            <div className="mb-10">
              <div className="font-semibold mb-2">{TEXT.preview[lang]}</div>
              <div className="flex gap-6 flex-wrap">
                {chartTypes.map(chart => (
                  <div
                    key={chart.key}
                    className={`border rounded-lg p-4 w-64 cursor-pointer transition-all duration-200 ${selectedChart === chart.key ? "border-blue-500 shadow-lg" : "border-gray-200 dark:border-gray-700"} bg-gray-100 dark:bg-gray-900`}
                    onClick={() => setSelectedChart(chart.key)}
                  >
                    <div className="font-medium mb-2 flex items-center gap-2">
                      <span>{chart.label[lang]}</span>
                      {selectedChart === chart.key && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded dark:bg-blue-900 dark:text-blue-200">{lang === "한국어" ? "선택됨" : "Selected"}</span>}
                    </div>
                    {/* 실제 차트 미리보기 */}
                    <div className="bg-gray-100 dark:bg-gray-900 rounded h-32 flex items-center justify-center text-gray-400 dark:text-gray-300">
                      {chart.key === "bar" && chartData.length > 0 && (
                        <ResponsiveContainer width="100%" height={100}>
                          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                            <XAxis dataKey="name" hide />
                            <YAxis hide />
                            <Bar dataKey="value" fill="#4F8EF7" />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                      {chart.key === "pie" && chartData.length > 0 && (
                        <ResponsiveContainer width="100%" height={100}>
                          <PieChart>
                            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={40}>
                              {chartData.map((entry, idx) => (
                                <Cell key={`cell-${idx}`} fill={EXCEL_COLORS[idx % EXCEL_COLORS.length]} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                      {chart.key === "line" && chartData.length > 0 && (
                        <ResponsiveContainer width="100%" height={100}>
                          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                            <XAxis dataKey="name" hide />
                            <YAxis hide />
                            <Line type="monotone" dataKey="value" stroke="#4F8EF7" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                      {chartData.length === 0 && <span>미리보기</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm text-gray-600">{TEXT.choose[lang]}</div>
            </div>
            {/* 실제 차트 렌더링 */}
            {chartData.length > 0 && (
              <div className="mb-6">
                <div className="font-semibold mb-2">{chartTypes.find(c => c.key === selectedChart)?.label[lang]} {lang === "한국어" ? "차트" : "Chart"}</div>
                <div className="bg-white border rounded-lg p-4 w-full dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
                  {selectedChart === "bar" && (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={chartData} margin={{ top: 30, right: 30, left: 30, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={60} tick={{ fontSize: 14 }} />
                        <YAxis tick={{ fontSize: 14 }} />
                        <Tooltip wrapperStyle={{ fontSize: 14 }} />
                        <Legend wrapperStyle={{ fontSize: 14 }} />
                        <Bar dataKey="value" fill={EXCEL_COLORS[0]} label={{ position: 'top', fontSize: 14, fill: '#222' }} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  {selectedChart === "pie" && (
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label={({ name, value }) => `${name}: ${value}` }>
                          {chartData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={EXCEL_COLORS[idx % EXCEL_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip wrapperStyle={{ fontSize: 14 }} />
                        <Legend wrapperStyle={{ fontSize: 14 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  {selectedChart === "line" && (
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={chartData} margin={{ top: 30, right: 30, left: 30, bottom: 60 }}>
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
              </div>
            )}
            <Button 
              onClick={handleSave} 
              className="w-full mt-2" 
              disabled={saving || !title.trim()}
              variant={saved ? "default" : "outline"}
            >
              {saving ? "⏳" : saved ? "✅" : "💾"} {saving ? "저장 중..." : saved ? TEXT.saved[lang] : TEXT.save[lang]}
            </Button>
          </>
        ) : (
          <div className="text-gray-400 text-center mt-12">{TEXT.no_table[lang]}</div>
        )}
      </main>
    </div>
  );
} 