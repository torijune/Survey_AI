"use client";

import React, { useState, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { useDropzone } from "react-dropzone";

const TEXT = {
  upload: { "한국어": "엑셀 파일 업로드", "English": "Upload Excel File" },
  drag_drop: { "한국어": "여기에 파일을 드래그하거나 클릭하여 선택하세요.", "English": "Drag and drop files here, or click to select files" },
  only_excel: { "한국어": "엑셀 파일(.xlsx, .xls)만 지원합니다.", "English": "Only .xlsx or .xls files are supported" },
  loading: { "한국어": "로딩 중...", "English": "Loading..." },
  error: { "한국어": "오류가 발생했습니다.", "English": "An error occurred." },
  select_table: { "한국어": "질문(테이블) 선택", "English": "Select Question/Table" },
  choose: { "한국어": "질문을 선택하세요.", "English": "Please select a question." },
  chart: { "한국어": "응답 분포 차트", "English": "Response Distribution Chart" },
  table: { "한국어": "원본 테이블 데이터", "English": "Original Table Data" },
  no_data: { "한국어": "데이터가 없습니다.", "English": "No data available." },
};

function UploadIcon() {
  return (
    <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mx-auto mb-2 text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>
  );
}

const CHART_TYPES = [
  { key: "bar", label: { "한국어": "막대 차트", "English": "Bar Chart" } },
  { key: "pie", label: { "한국어": "원형 차트", "English": "Pie Chart" } },
  { key: "line", label: { "한국어": "선형 차트", "English": "Line Chart" } },
];

const EXCEL_COLORS = [
  '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47', '#264478', '#9E480E', '#636363', '#997300', '#255E91', '#43682B'
];

export default function TableVisualizationPage() {
  const [lang, setLang] = useState<"한국어" | "English">("한국어");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [surveyData, setSurveyData] = useState<any>(null);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [chartType, setChartType] = useState<"bar" | "pie" | "line">("bar");

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setLoading(true);
    setError("");
    setSurveyData(null);
    setSelectedKey("");
    try {
      const formData = new FormData();
      formData.append("file", acceptedFiles[0]);
      const baseUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${baseUrl}/api/visualization`, { method: "POST", body: formData });
      if (!res.ok) throw new Error(TEXT.error[lang]);
      const data = await res.json();
      setSurveyData(data);
    } catch (err: any) {
      setError(err.message || TEXT.error[lang]);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  // 선택된 테이블 정보
  const currentTable = surveyData && selectedKey ? surveyData.tables[selectedKey] : null;
  // "대분류" 컬럼 인덱스 찾기
  const mainCategoryIdx = currentTable?.columns.findIndex((col: string) => col.replace(/\s/g, "") === "대분류");
  // "전체" 행 찾기
  const totalRow = currentTable?.data.find((row: any[]) => (row[mainCategoryIdx] || "").replace(/\s/g, "") === "전체");
  // 메타 컬럼명 집합
  const metaCols = new Set(["대분류", "소분류", "사례수"]);
  // 응답 컬럼 인덱스: 메타 컬럼을 제외한 나머지
  const responseColIndices = currentTable
    ? currentTable.columns
        .map((col: any, idx: number) => ({ col, idx }))
        .filter(({ col }: { col: any }) => !metaCols.has(col.replace(/\s/g, "")))
        .map(({ idx }: { idx: number }) => idx)
    : [];
  const responseLabels = currentTable
    ? responseColIndices.map((idx: number) => currentTable.columns[idx])
    : [];
  const responseValues = totalRow
    ? responseColIndices.map((idx: number) => totalRow[idx])
    : [];
  const chartData = responseLabels.map((label: string, idx: number) => ({
    name: label,
    value: Number(responseValues[idx]) || 0,
  }));

  return (
    <div className="w-full min-h-screen flex flex-row bg-gray-50 dark:bg-gray-900 dark:text-gray-100">
      {/* 사이드바 */}
      <aside className="w-full max-w-xs min-w-[260px] bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col px-6 py-8 gap-6 sticky top-0 h-screen z-10">
        <div className="flex items-center justify-between mb-6">
          <span className="font-bold text-lg">설문 시각화</span>
          <button onClick={() => setLang(lang === "한국어" ? "English" : "한국어")}
            className="px-3 py-1 rounded border text-sm bg-white dark:bg-gray-800 dark:border-gray-700">
            {lang === "한국어" ? "English" : "한국어"}
          </button>
        </div>
        {/* 업로드 카드 */}
        <div className="mb-4">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900' : 'border-gray-300 hover:border-gray-400 dark:border-gray-600'}`}>
              <input {...getInputProps()} />
              <UploadIcon />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {isDragActive ? TEXT.drag_drop[lang] : TEXT.only_excel[lang]}
              </p>
            </div>
            {loading && <div className="text-blue-600 my-2 text-sm">{TEXT.loading[lang]}</div>}
            {error && <div className="text-red-600 my-2 text-sm">{error}</div>}
                </div>
              </div>
        {/* 질문 선택 드롭다운 */}
        {surveyData && surveyData.question_keys && (
          <div className="mt-4">
            <label className="block font-medium mb-1">{TEXT.select_table[lang]}</label>
            <select
              className="w-full border rounded px-3 py-2 bg-white text-gray-900 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:border-gray-700"
              value={selectedKey}
              onChange={e => setSelectedKey(e.target.value)}
            >
              <option value="">{TEXT.choose[lang]}</option>
              {surveyData.question_keys.map((key: string) => {
                const question = surveyData.question_texts[key] || key;
                return (
                  <option key={key} value={key}>{key} - {question.length > 50 ? question.slice(0, 50) + "..." : question}</option>
                );
              })}
            </select>
            {/* 차트 유형 선택 */}
            {selectedKey && (
              <div className="mt-4">
                <label className="block font-medium mb-1">{lang === "한국어" ? "차트 유형" : "Chart Type"}</label>
                <select
                  className="w-full border rounded px-3 py-2 bg-white text-gray-900 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:border-gray-700"
                  value={chartType}
                  onChange={e => setChartType(e.target.value as any)}
                >
                  {CHART_TYPES.map(type => (
                    <option key={type.key} value={type.key}>{type.label[lang]}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </aside>
      {/* 메인 영역 */}
      <main className="flex-1 flex flex-col items-center py-10 px-4 overflow-y-auto">
        <div className="w-full max-w-3xl">
          {/* 차트 */}
          {currentTable && chartData.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-8 border border-gray-200 dark:border-gray-700">
              <div className="font-semibold mb-2">{TEXT.chart[lang]}</div>
              {chartType === "bar" && (
                <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={chartData} margin={{ top: 30, right: 30, left: 30, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={60} tick={{ fontSize: 14 }} />
                        <YAxis tick={{ fontSize: 14 }} />
                        <Tooltip wrapperStyle={{ fontSize: 14 }} />
                    <Bar dataKey="value" fill="#4472C4" label={{ position: 'top', fontSize: 14, fill: '#222' }} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
              {chartType === "pie" && (
                <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label={({ name, value }) => `${name}: ${value}` }>
                      {chartData.map((entry: any, idx: number) => (
                            <Cell key={`cell-${idx}`} fill={EXCEL_COLORS[idx % EXCEL_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip wrapperStyle={{ fontSize: 14 }} />
                        <Legend wrapperStyle={{ fontSize: 14 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
              {chartType === "line" && (
                <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={chartData} margin={{ top: 30, right: 30, left: 30, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={60} tick={{ fontSize: 14 }} />
                        <YAxis tick={{ fontSize: 14 }} />
                        <Tooltip wrapperStyle={{ fontSize: 14 }} />
                        <Legend wrapperStyle={{ fontSize: 14 }} />
                    <Line type="monotone" dataKey="value" stroke="#4472C4" strokeWidth={3} dot label={{ fontSize: 14, fill: '#222' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
            </div>
          )}
          {/* 원본 테이블 */}
          {currentTable && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <div className="font-semibold mb-2">{TEXT.table[lang]}</div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 dark:border-gray-700 text-sm">
                  <thead>
                    <tr>
                      {currentTable.columns.map((col: string, idx: number) => (
                        <th key={idx} className="border border-gray-300 dark:border-gray-700 px-2 py-1 bg-gray-50 dark:bg-gray-800">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentTable.data.map((row: any[], rIdx: number) => (
                      <tr key={rIdx}>
                        {row.map((cell: any, cIdx: number) => (
                          <td key={cIdx} className="border border-gray-300 dark:border-gray-700 px-2 py-1">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          {/* 안내 메시지 */}
          {!surveyData && !loading && (
            <div className="text-gray-400 text-center mt-24">{TEXT.no_data[lang]}</div>
        )}
        </div>
      </main>
    </div>
  );
} 