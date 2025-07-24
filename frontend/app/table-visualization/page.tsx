"use client";

import React, { useState, useCallback, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { useDropzone } from "react-dropzone";
import { supabase } from '@/lib/supabaseClient';

const TEXT = {
  upload: { "한국어": "설문 시각화 파일 업로드", "English": "Survey Visualization File Upload" },
  drag_drop: { "한국어": "여기에 파일을 드래그하거나 클릭하여 선택하세요.", "English": "Drag and drop files here, or click to select files" },
  only_excel: { "한국어": "엑셀 파일(.xlsx, .xls)만 지원합니다.", "English": "Only .xlsx or .xls files are supported" },
  loading: { "한국어": "로딩 중...", "English": "Loading..." },
  error: { "한국어": "오류가 발생했습니다.", "English": "An error occurred." },
  select_table: { "한국어": "질문(테이블) 선택", "English": "Select Question/Table" },
  choose: { "한국어": "질문을 선택하세요.", "English": "Please select a question." },
  chart: { "한국어": "응답 분포 차트", "English": "Response Distribution Chart" },
  table: { "한국어": "원본 테이블 데이터", "English": "Original Table Data" },
  no_data: { "한국어": "데이터가 없습니다.", "English": "No data available." },
  file_uploaded: { "한국어": "엑셀 파일 업로드됨", "English": "Excel file uploaded" },
  save: { "한국어": "시각화 저장", "English": "Save Visualization" },
  save_title: { "한국어": "제목", "English": "Title" },
  save_description: { "한국어": "설명 (선택사항)", "English": "Description (Optional)" },
  save_success: { "한국어": "시각화가 성공적으로 저장되었습니다!", "English": "Visualization saved successfully!" },
  save_error: { "한국어": "저장 중 오류가 발생했습니다.", "English": "Error occurred while saving." },
  save_required: { "한국어": "제목을 입력해주세요.", "English": "Please enter a title." },
  save_cancel: { "한국어": "취소", "English": "Cancel" },
  save_confirm: { "한국어": "저장", "English": "Save" },
};

function UploadIcon() {
  return (
    <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mx-auto mb-3 text-gray-400">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-green-600">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-green-600">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
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
  const [user, setUser] = useState<any>(null);
  const [lang, setLang] = useState<"한국어" | "English">("한국어");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [tableData, setTableData] = useState<any>(null);
  const [chartType, setChartType] = useState<"bar" | "pie" | "line">("bar");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [questions, setQuestions] = useState<Array<{key: string, text: string}>>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string>("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [visualizationTitle, setVisualizationTitle] = useState<string>("");
  const [visualizationDescription, setVisualizationDescription] = useState<string>("");

  // 사용자 상태 확인
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setLoading(true);
    setError("");
    setTableData(null);
    setSelectedColumns([]);
    setQuestions([]);
    setSelectedQuestion("");
    setUploadedFileName(acceptedFiles[0].name);
    setUploadedFile(acceptedFiles[0]);
    
    try {
      const formData = new FormData();
      formData.append("file", acceptedFiles[0]);
      const baseUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8000";
      
      // 먼저 모든 질문 목록을 가져오기
      const questionsRes = await fetch(`${baseUrl}/api/visualization/questions`, { method: "POST", body: formData });
      if (!questionsRes.ok) throw new Error(TEXT.error[lang]);
      const questionsData = await questionsRes.json();
      setQuestions(questionsData.questions);
      
      // 첫 번째 질문을 기본으로 선택
      if (questionsData.questions.length > 0) {
        setSelectedQuestion(questionsData.questions[0].key);
        
        // 선택된 질문의 데이터 가져오기
        const questionFormData = new FormData();
        questionFormData.append("file", acceptedFiles[0]);
        questionFormData.append("question_key", questionsData.questions[0].key);
        
        const questionRes = await fetch(`${baseUrl}/api/visualization/question-data`, { 
          method: "POST", 
          body: questionFormData 
        });
        if (!questionRes.ok) throw new Error(TEXT.error[lang]);
        const data = await questionRes.json();
        setTableData(data);
        
        // 기본적으로 첫 번째 행의 데이터가 있는 컬럼들을 선택 (소분류, 사례수, 평균, % 제외)
        if (data.columns && data.data && data.data.length > 0) {
          const availableColumns = data.columns.slice(1).filter((col: string, idx: number) => {
            // 소분류, 사례수 컬럼은 제외
            if (col === "소분류" || col === "사례수") return false;
            
            const value = data.data[0]?.[idx + 1];
            return value !== null && value !== undefined && value !== '';
          });
          
          // 평균, %가 포함된 컬럼들은 디폴트에서 제외하되 선택 가능하게 유지
          const defaultColumns = availableColumns.filter((col: string) => 
            !col.includes("평균") && !col.includes("%")
          );
          
          // 만약 필터링 후 컬럼이 없다면, 최소 1개는 선택하도록 함
          if (defaultColumns.length === 0 && availableColumns.length > 0) {
            setSelectedColumns([availableColumns[0]]);
          } else {
            setSelectedColumns(defaultColumns);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || TEXT.error[lang]);
      setUploadedFileName("");
      setUploadedFile(null);
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

  const handleSaveVisualization = async () => {
    if (!user) {
      setSaveError("로그인이 필요합니다.");
      return;
    }

    if (!visualizationTitle.trim()) {
      setSaveError(TEXT.save_required[lang]);
      return;
    }

    if (!tableData) {
      setSaveError(TEXT.error[lang]);
      return;
    }

    if (selectedColumns.length === 0) {
      setSaveError(lang === "한국어" ? "시각화할 컬럼을 선택해주세요." : "Please select columns to visualize.");
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('세션이 만료되었습니다.');
      }

      const baseUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8000";
      
      const saveData = {
        user_id: user.id,
        title: visualizationTitle,
        description: visualizationDescription,
        question_key: selectedQuestion,
        question_text: tableData.question_text || "업로드된 테이블",
        file_name: uploadedFileName,
        chart_type: chartType,
        selected_columns: selectedColumns,
        chart_data: chartData
      };

      const response = await fetch(`${baseUrl}/api/visualization/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify(saveData),
      });

      if (!response.ok) {
        throw new Error(TEXT.save_error[lang]);
      }

      const result = await response.json();
      setSaveSuccess(true);
      setShowSaveDialog(false);
      setVisualizationTitle("");
      setVisualizationDescription("");
      
      // 3초 후 성공 메시지 숨기기
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error("저장 오류:", error);
      setSaveError(TEXT.save_error[lang]);
    } finally {
      setSaving(false);
    }
  };

  // 차트 데이터 생성
  const chartData = tableData && selectedColumns.length > 0 ? selectedColumns.map((col: string) => {
    const colIndex = tableData.columns.indexOf(col);
    return {
      name: col,
      value: Number(tableData.data[0]?.[colIndex]) || 0,
    };
  }) : [];

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
            {/* 제목 */}
            <div className="flex items-center mb-4">
              <DocumentIcon />
              <h3 className="ml-2 font-semibold text-gray-900 dark:text-gray-100">{TEXT.upload[lang]}</h3>
            </div>
            
            {/* 업로드 영역 */}
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900' : 'border-gray-300 hover:border-gray-400 dark:border-gray-600'}`}>
              <input {...getInputProps()} />
              <UploadIcon />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {isDragActive ? TEXT.drag_drop[lang] : TEXT.only_excel[lang]}
              </p>
            </div>
            
            {/* 로딩 상태 */}
            {loading && <div className="text-blue-600 my-2 text-sm">{TEXT.loading[lang]}</div>}
            
            {/* 에러 상태 */}
            {error && <div className="text-red-600 my-2 text-sm">{error}</div>}
            
            {/* 업로드 성공 상태 */}
            {uploadedFileName && tableData && (
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center">
                  <CheckIcon />
                  <span className="ml-2 text-sm text-green-700 dark:text-green-300">
                    {TEXT.file_uploaded[lang]}: {uploadedFileName}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* 질문 선택 */}
        {questions.length > 0 && (
          <div className="mt-4">
            <label className="block font-medium mb-2">{lang === "한국어" ? "질문 선택" : "Select Question"}</label>
            <select
              className="w-full border rounded px-3 py-2 bg-white text-gray-900 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:border-gray-700"
              value={selectedQuestion}
              onChange={async (e) => {
                const questionKey = e.target.value;
                setSelectedQuestion(questionKey);
                setLoading(true);
                setError("");
                
                try {
                  if (uploadedFile) {
                    const formData = new FormData();
                    formData.append("file", uploadedFile);
                    formData.append("question_key", questionKey);
                    
                    const baseUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8000";
                    const res = await fetch(`${baseUrl}/api/visualization/question-data`, { 
                      method: "POST", 
                      body: formData 
                    });
                    if (!res.ok) throw new Error(TEXT.error[lang]);
                    const data = await res.json();
                    setTableData(data);
                    
                    // 새로운 질문의 컬럼들로 선택 초기화 (소분류, 사례수, 평균, % 제외)
                    if (data.columns && data.data && data.data.length > 0) {
                      const availableColumns = data.columns.slice(1).filter((col: string, idx: number) => {
                        if (col === "소분류" || col === "사례수") return false;
                        const value = data.data[0]?.[idx + 1];
                        return value !== null && value !== undefined && value !== '';
                      });
                      
                      // 평균, %가 포함된 컬럼들은 디폴트에서 제외하되 선택 가능하게 유지
                      const defaultColumns = availableColumns.filter((col: string) => 
                        !col.includes("평균") && !col.includes("%")
                      );
                      
                      // 만약 필터링 후 컬럼이 없다면, 최소 1개는 선택하도록 함
                      if (defaultColumns.length === 0 && availableColumns.length > 0) {
                        setSelectedColumns([availableColumns[0]]);
                      } else {
                        setSelectedColumns(defaultColumns);
                      }
                    }
                  }
                } catch (err: any) {
                  setError(err.message || TEXT.error[lang]);
                } finally {
                  setLoading(false);
                }
              }}
            >
              {questions.map((question) => (
                <option key={question.key} value={question.key}>
                  {question.key}: {question.text.length > 50 ? question.text.substring(0, 50) + "..." : question.text}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* 차트 유형 선택 */}
        {tableData && (
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
        
        {/* 컬럼 선택 */}
        {tableData && tableData.columns && (
          <div className="mt-4">
            <label className="block font-medium mb-2">{lang === "한국어" ? "시각화할 컬럼 선택" : "Select Columns to Visualize"}</label>
            <div className="max-h-48 overflow-y-auto border rounded p-2 bg-white dark:bg-gray-800">
              {tableData.columns.slice(1).map((col: string, idx: number) => {
                // 소분류, 사례수 컬럼은 제외
                if (col === "소분류" || col === "사례수") return null;
                
                const hasData = tableData.data[0]?.[idx + 1] !== null && 
                               tableData.data[0]?.[idx + 1] !== undefined && 
                               tableData.data[0]?.[idx + 1] !== '';
                const isAverageOrPercent = col.includes("평균") || col.includes("%");
                
                return (
                  <label key={idx} className={`flex items-center p-1 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${!hasData ? 'opacity-50' : ''} ${isAverageOrPercent ? 'border-l-2 border-orange-300 pl-2' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(col)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedColumns(prev => [...prev, col]);
                        } else {
                          setSelectedColumns(prev => prev.filter(c => c !== col));
                        }
                      }}
                      disabled={!hasData}
                      className="mr-2"
                    />
                    <span className={`text-sm truncate ${isAverageOrPercent ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                      {col}
                      {isAverageOrPercent && (
                        <span className="ml-1 text-xs text-gray-400">(통계)</span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {lang === "한국어" ? "데이터가 있는 컬럼만 선택 가능합니다. 주황색은 통계 컬럼입니다." : "Only columns with data can be selected. Orange items are statistical columns."}
            </div>
          </div>
        )}

        {/* 저장 버튼 */}
        {user && tableData && (
          <div className="mt-6">
            <button
              onClick={() => setShowSaveDialog(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {TEXT.save[lang]}
            </button>
          </div>
        )}



        {/* 로그인 안내 */}
        {!user && tableData && (
          <div className="mt-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {lang === "한국어" ? "시각화를 저장하려면 로그인이 필요합니다." : "Login required to save visualization."}
            </p>
          </div>
        )}

        {/* 성공 메시지 */}
        {saveSuccess && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center">
              <CheckIcon />
              <span className="ml-2 text-sm text-green-700 dark:text-green-300">
                {TEXT.save_success[lang]}
              </span>
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {saveError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <span className="text-sm text-red-700 dark:text-red-300">
              {saveError}
            </span>
          </div>
        )}
      </aside>
      {/* 메인 영역 */}
      <main className="flex-1 flex flex-col items-center py-10 px-4 overflow-y-auto">
        <div className="w-full max-w-3xl">
          {/* 차트 */}
          {tableData && selectedColumns.length > 0 && chartData.length > 0 && (
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
          {tableData && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <div className="font-semibold mb-2">
                {TEXT.table[lang]} 
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                  ({lang === "한국어" ? "상위 10개 행" : "Top 10 rows"})
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 dark:border-gray-700 text-sm">
                  <thead>
                    <tr>
                      {tableData.columns.map((col: string, idx: number) => (
                        <th key={idx} className="border border-gray-300 dark:border-gray-700 px-2 py-1 bg-gray-50 dark:bg-gray-800">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.data.slice(0, 10).map((row: any[], rIdx: number) => (
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
          {!tableData && !loading && (
            <div className="text-gray-400 text-center mt-24">{TEXT.no_data[lang]}</div>
          )}
          {tableData && selectedColumns.length === 0 && (
            <div className="text-gray-400 text-center mt-24">
              {lang === "한국어" ? "시각화할 컬럼을 선택해주세요" : "Please select columns to visualize"}
            </div>
          )}
        </div>
      </main>

      {/* 저장 다이얼로그 */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">
              {TEXT.save[lang]}
            </h3>
            
            {/* 선택된 컬럼 정보 */}
            {selectedColumns.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                  {lang === "한국어" ? "선택된 컬럼" : "Selected Columns"}:
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {selectedColumns.join(", ")}
                </p>
              </div>
            )}
            
            {selectedColumns.length === 0 && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {lang === "한국어" ? "시각화할 컬럼을 선택해주세요." : "Please select columns to visualize."}
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                  {TEXT.save_title[lang]} *
                </label>
                <input
                  type="text"
                  value={visualizationTitle}
                  onChange={(e) => setVisualizationTitle(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder={lang === "한국어" ? "시각화 제목을 입력하세요" : "Enter visualization title"}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                  {TEXT.save_description[lang]}
                </label>
                <textarea
                  value={visualizationDescription}
                  onChange={(e) => setVisualizationDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder={lang === "한국어" ? "시각화에 대한 설명을 입력하세요 (선택사항)" : "Enter description for visualization (optional)"}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setVisualizationTitle("");
                  setVisualizationDescription("");
                  setSaveError("");
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              >
                {TEXT.save_cancel[lang]}
              </button>
              <button
                onClick={handleSaveVisualization}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? TEXT.loading[lang] : TEXT.save_confirm[lang]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 