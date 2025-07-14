"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Bot, Edit3, Database, Folder, File, ChevronRight, ChevronDown, BarChart3, PieChart, Users, FileText, Calendar, CheckCircle, Eye, TrendingUp } from "lucide-react";
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';

// 카테고리별 fetch 함수 (Authorization 헤더 추가)
async function fetchPlans(token: string) {
  const res = await fetch('/api/survey-plans', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('설문 계획 조회 실패');
  const data = await res.json();
  return data.data || [];
}
async function fetchAnalyses(token: string) {
  const res = await fetch('/api/survey-analyses', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('설문 분석 조회 실패');
  const data = await res.json();
  return data.data || [];
}
async function fetchVisualizations(token: string) {
  const res = await fetch('/api/survey-visualizations', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('시각화 조회 실패');
  const data = await res.json();
  return data.data || [];
}
async function fetchFGIAnalyses(token: string) {
  const res = await fetch('/api/fgi-analyses', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('FGI 분석 조회 실패');
  const data = await res.json();
  return data.data || [];
}

const CATEGORIES = [
  { key: 'plans', label: '설문 계획', icon: FileText },
  { key: 'analyses', label: '설문 분석', icon: BarChart3 },
  { key: 'visualizations', label: '시각화', icon: PieChart },
  { key: 'fgi', label: 'FGI 분석', icon: Users },
];

function formatDate(dateString?: string) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function PlanDetail({ data }: { data: any }) {
  return (
    <Card className="max-w-2xl mx-auto p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-5 h-5 text-blue-600" />
        <span className="text-xl font-bold">{data.topic}</span>
      </div>
      {data.objective && <div className="text-gray-700 mb-2">{data.objective}</div>}
      <div className="flex items-center text-xs text-gray-500 mb-2">
        <Calendar className="w-4 h-4 mr-1" />
        생성일: {formatDate(data.created_at)}
      </div>
      <div className="text-xs text-gray-400">ID: {data.id}</div>
    </Card>
  );
}

function AnalysisDetail({ data }: { data: any }) {
  return (
    <Card className="max-w-2xl mx-auto p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-5 h-5 text-purple-600" />
        <span className="text-xl font-bold">{data.title}</span>
      </div>
      {data.description && <div className="text-gray-700 mb-2">{data.description}</div>}
      {data.uploaded_file_name && (
        <div className="flex items-center text-xs text-gray-500 mb-1">
          <FileText className="w-4 h-4 mr-1" />파일명: {data.uploaded_file_name}
        </div>
      )}
      {data.analysis_result && (
        <div className="space-y-1 mb-2">
          {data.analysis_result.analysisMetadata?.analysisType && (
            <div className="flex items-center text-xs text-gray-500">
              <TrendingUp className="w-4 h-4 mr-1" />
              분석 유형: {data.analysis_result.analysisMetadata.analysisType === 'single' ? '단일 분석' : '일괄 분석'}
            </div>
          )}
          {data.analysis_result.statisticalResults && (
            <div className="flex items-center text-xs text-green-600">
              <CheckCircle className="w-4 h-4 mr-1" />통계 결과 포함
            </div>
          )}
          {data.analysis_result.workflowSteps?.length > 0 && (
            <div className="flex items-center text-xs text-gray-500">
              <BarChart3 className="w-4 h-4 mr-1" />
              워크플로우 단계: {data.analysis_result.workflowSteps.length} 단계
            </div>
          )}
        </div>
      )}
      <div className="flex items-center text-xs text-gray-500 mb-2">
        <Calendar className="w-4 h-4 mr-1" />
        생성일: {formatDate(data.created_at)}
      </div>
      <div className="text-xs text-gray-400">ID: {data.id}</div>
    </Card>
  );
}

function VisualizationDetail({ data }: { data: any }) {
  return (
    <Card className="max-w-2xl mx-auto p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <PieChart className="w-5 h-5 text-orange-600" />
        <span className="text-xl font-bold">{data.title}</span>
      </div>
      {data.description && <div className="text-gray-700 mb-2">{data.description}</div>}
      {data.selected_chart_type && (
        <div className="flex items-center text-xs text-gray-500 mb-1">
          <BarChart3 className="w-4 h-4 mr-1" />차트 유형: {data.selected_chart_type}
        </div>
      )}
      {data.uploaded_file_name && (
        <div className="flex items-center text-xs text-gray-500 mb-1">
          <FileText className="w-4 h-4 mr-1" />파일명: {data.uploaded_file_name}
        </div>
      )}
      <div className="flex items-center text-xs text-gray-500 mb-2">
        <Calendar className="w-4 h-4 mr-1" />
        생성일: {formatDate(data.created_at)}
      </div>
      <div className="text-xs text-gray-400">ID: {data.id}</div>
    </Card>
  );
}

function FgiDetail({ data }: { data: any }) {
  return (
    <Card className="max-w-2xl mx-auto p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-5 h-5 text-sky-600" />
        <span className="text-xl font-bold">{data.title}</span>
      </div>
      {data.description && <div className="text-gray-700 mb-2">{data.description}</div>}
      <div className="space-y-1 mb-2">
        {data.audio_files_count > 0 && (
          <div className="flex items-center text-xs text-blue-500">
            <FileText className="w-4 h-4 mr-1" />음성 파일: {data.audio_files_count}개
          </div>
        )}
        {data.doc_files_count > 0 && (
          <div className="flex items-center text-xs text-green-500">
            <FileText className="w-4 h-4 mr-1" />문서 파일: {data.doc_files_count}개
          </div>
        )}
        {data.guide_file_name && (
          <div className="flex items-center text-xs text-orange-500">
            <FileText className="w-4 h-4 mr-1" />가이드라인: {data.guide_file_name}
          </div>
        )}
      </div>
      <div className="flex items-center text-xs text-gray-500 mb-2">
        <Calendar className="w-4 h-4 mr-1" />
        생성일: {formatDate(data.created_at)}
      </div>
      <div className="text-xs text-gray-400">ID: {data.id}</div>
    </Card>
  );
}

export default function EditorPage() {
  const { user, loading: authLoading } = useAuth('/editor');
  const [tree, setTree] = useState<any>({});
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selected, setSelected] = useState<{cat: string, id: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 카드별 width state (px)
  const [sidebarWidth, setSidebarWidth] = useState(280); // min 200, max 400
  const [editorWidth, setEditorWidth] = useState(0); // 0이면 flex-1
  const [chatbotWidth, setChatbotWidth] = useState(360); // min 280, max 500

  // 리사이저 드래그 상태
  const dragState = useRef<{ type: 'sidebar' | 'chatbot' | null, startX: number, startSidebar: number, startChatbot: number } | null>(null);

  // 드래그 이벤트 핸들러
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragState.current) return;
      if (dragState.current.type === 'sidebar') {
        let newWidth = dragState.current.startSidebar + (e.clientX - dragState.current.startX);
        newWidth = Math.max(200, Math.min(400, newWidth));
        setSidebarWidth(newWidth);
      } else if (dragState.current.type === 'chatbot') {
        let newWidth = dragState.current.startChatbot - (e.clientX - dragState.current.startX);
        newWidth = Math.max(280, Math.min(500, newWidth));
        setChatbotWidth(newWidth);
      }
    }
    function onMouseUp() {
      dragState.current = null;
      document.body.style.cursor = '';
    }
    if (dragState.current) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'ew-resize';
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
    };
  }, [sidebarWidth, chatbotWidth]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('세션이 만료되었습니다. 다시 로그인 해주세요.');
        const token = session.access_token;
        const [plans, analyses, visualizations, fgi] = await Promise.all([
          fetchPlans(token), fetchAnalyses(token), fetchVisualizations(token), fetchFGIAnalyses(token)
        ]);
        setTree({ plans, analyses, visualizations, fgi });
      } catch (e: any) {
        setError(e?.message || '데이터를 불러오지 못했습니다');
      } finally {
        setLoading(false);
      }
    };
    if (user) load();
  }, [user]);

  const toggleCategory = (cat: string) => {
    setExpanded(prev => prev.includes(cat) ? prev.filter(e => e !== cat) : [...prev, cat]);
  };

  // 선택된 데이터 정보
  let selectedData = null;
  if (selected && tree[selected.cat]) {
    selectedData = tree[selected.cat].find((item: any) => item.id === selected.id);
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-lg text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
        인증 확인 중...
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full gap-0 px-6 py-6 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 select-none">
      {/* 사이드바 */}
      <div style={{ width: sidebarWidth, minWidth: 200, maxWidth: 400, height: '100%' }}>
        <Card className="w-full h-full flex flex-col shadow-md border-gray-200 dark:border-gray-700">
          <CardHeader className="flex-row items-center gap-2 border-b bg-white dark:bg-gray-900">
            <Database className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-base">데이터 목록</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="p-4 text-center text-gray-400">불러오는 중...</div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">{error}</div>
            ) : (
              <div>
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const items = tree[cat.key] || [];
                  return (
                    <div key={cat.key} className="mb-1">
                      {/* 카테고리(폴더) 헤더 */}
                      <div
                        className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors hover:bg-gray-50 ${expanded.includes(cat.key) ? 'bg-blue-50 border border-blue-200' : ''}`}
                        onClick={() => toggleCategory(cat.key)}
                      >
                        <div className="flex items-center flex-1 min-w-0">
                          <Folder className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
                          <Icon className="w-4 h-4 text-blue-500 mr-1" />
                          <span className="text-sm font-medium text-gray-900 truncate">{cat.label}</span>
                        </div>
                        {expanded.includes(cat.key) ? (
                          <ChevronDown className="w-3 h-3 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-gray-500" />
                        )}
                      </div>
                      {/* 카테고리 내용 (확장 시) */}
                      {expanded.includes(cat.key) && (
                        <div className="ml-6 mt-1 space-y-1">
                          {items.length === 0 ? (
                            <div className="text-xs text-gray-400 p-2">데이터 없음</div>
                          ) : (
                            items.map((item: any) => (
                              <div
                                key={item.id}
                                className={`flex items-center p-1 rounded cursor-pointer hover:bg-gray-100 ${selected?.cat === cat.key && selected?.id === item.id ? 'bg-blue-100' : ''}`}
                                onClick={() => setSelected({ cat: cat.key, id: item.id })}
                              >
                                <File className="w-3 h-3 text-gray-400 mr-2" />
                                <span className="text-xs text-gray-700 truncate">{item.title || item.topic || item.uploaded_file_name || item.guide_file_name || '이름 없음'}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* 리사이저: 사이드바-에디터 */}
      <div
        className="w-2 cursor-ew-resize flex-shrink-0 z-10 hover:bg-blue-100 transition"
        onMouseDown={e => {
          dragState.current = { type: 'sidebar', startX: e.clientX, startSidebar: sidebarWidth, startChatbot: chatbotWidth };
        }}
        style={{ cursor: 'ew-resize', height: '100%' }}
      />
      {/* 에디터 */}
      <div style={{ flex: 1, minWidth: 200, height: '100%' }}>
        <Card className="w-full h-full flex flex-col shadow-md border-gray-200 dark:border-gray-700">
          <CardHeader className="flex-row items-center gap-2 border-b bg-white dark:bg-gray-900">
            <Edit3 className="w-5 h-5 text-indigo-600" />
            <CardTitle className="text-base">에디터</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-6 gap-4">
            {selectedData ? (
              <div>
                {selected?.cat === 'plans' && <PlanDetail data={selectedData} />}
                {selected?.cat === 'analyses' && <AnalysisDetail data={selectedData} />}
                {selected?.cat === 'visualizations' && <VisualizationDetail data={selectedData} />}
                {selected?.cat === 'fgi' && <FgiDetail data={selectedData} />}
              </div>
            ) : (
              <div className="text-gray-400 text-center mt-20">왼쪽에서 데이터를 선택하세요.</div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* 리사이저: 에디터-챗봇 */}
      <div
        className="w-2 cursor-ew-resize flex-shrink-0 z-10 hover:bg-purple-100 transition"
        onMouseDown={e => {
          dragState.current = { type: 'chatbot', startX: e.clientX, startSidebar: sidebarWidth, startChatbot: chatbotWidth };
        }}
        style={{ cursor: 'ew-resize', height: '100%' }}
      />
      {/* 챗봇 */}
      <div style={{ width: chatbotWidth, minWidth: 280, maxWidth: 500, height: '100%' }}>
        <Card className="w-full h-full flex flex-col shadow-md border-gray-200 dark:border-gray-700">
          <CardHeader className="flex-row items-center gap-2 border-b bg-white dark:bg-gray-900">
            <Bot className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-base">LLM 챗봇</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-4 gap-2">
            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded p-3 text-gray-500 mb-2">
              <div className="mb-2">챗봇과의 대화가 여기에 표시됩니다.</div>
            </div>
            <div className="flex gap-2">
              <Input placeholder="질문을 입력하세요..." className="flex-1" />
              <Button>전송</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 