"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDropzone } from "react-dropzone";
import { FileText, Upload, CheckCircle, AlertCircle, Mic, FileAudio, Users, Save, Copy, Star, Plus } from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import ReactMarkdown from 'react-markdown';
import FeatureHero from '@/components/FeatureHero';
import { v4 as uuidv4 } from 'uuid';
import { renderAsync } from 'docx-preview';

const TEXT: Record<string, Record<string, string>> = {
  back_to_home: { "한국어": "홈으로", "English": "Back to Home" },
  title: { "한국어": "FGI 분석", "English": "FGI Analysis" },
  desc: {
    "한국어": "FGI(Focus Group Interview) 회의를 음성 녹음 또는 텍스트 문서로 분석하여 전문적인 보고서를 생성합니다.",
    "English": "Analyze FGI (Focus Group Interview) meetings through audio recordings or text documents to generate professional reports."
  },
  audio_upload: { "한국어": "FGI 음성 파일 업로드", "English": "Upload FGI Audio Files" },
  doc_upload: { "한국어": "FGI 문서 파일 업로드", "English": "Upload FGI Document Files" },
  audio_formats: { "한국어": "음성 파일(.mp3, .wav, .m4a)만 지원합니다.", "English": "Only .mp3, .wav, .m4a files are supported" },
  doc_formats: { "한국어": "문서 파일(.docx, .txt)만 지원합니다.", "English": "Only .docx, .txt files are supported" },
  drag_drop: { "한국어": "여기에 파일을 드래그하거나 클릭하여 선택하세요.", "English": "Drag and drop files here, or click to select files" },
  processing: { "한국어": "파일 처리 중...", "English": "Processing file..." },
  transcribing: { "한국어": "음성 변환 중...", "English": "Transcribing audio..." },
  analyzing: { "한국어": "FGI 분석 중...", "English": "Analyzing FGI..." },
  loaded: { "한국어": "성공적으로 파일이 업로드되었습니다.", "English": "File uploaded successfully." },
  error: { "한국어": "오류 발생", "English": "Error occurred" },
  analyze: { "한국어": "FGI 분석 시작", "English": "Start FGI Analysis" },
  title_placeholder: { "한국어": "FGI 보고서 제목을 입력하세요", "English": "Enter FGI report title" },
  description_placeholder: { "한국어": "FGI 분석에 대한 설명을 입력하세요 (선택사항)", "English": "Enter description for this FGI analysis (optional)" },
  save: { "한국어": "저장", "English": "Save" },
  saved: { "한국어": "저장 완료!", "English": "Saved!" },
  saving: { "한국어": "저장 중...", "English": "Saving..." },
};

const MODE_TOP_DESC = {
  'audio': 'FGI 회의 음성 파일등 회의 내용 음성 파일을 업로드하면 자동으로 텍스트로 변환 후, 회의 전반적인 내용을 요약하여 자연어 형태로 분석·정리합니다.',
  'doc-summary': 'FGI 회의록 등 회의 내용 관련 회의 전반적인 내용을 요약하여 자연어 형태로 분석·정리합니다.',
  'doc-rag': 'FGI 회의록 등 문서를 업로드한 뒤 궁금한 점을 자유롭게 질문하면, AI가 문서 내용을 바탕으로 근거와 함께 답변을 제공합니다. (RAG 기반 질의응답)',
  'topic-analysis': 'FGI 가이드라인에서 주제를 추출하여 원하는 주제별로 분석을 진행합니다. 가이드라인 파일(docx) 업로드 후 주제를 선택하거나 직접 입력할 수 있습니다.'
};

// 1. 분석 분위기별 설명 텍스트
const TONE_DESCRIPTIONS: Record<string, string> = {
  "설명 중심": "선택한 주제에 대해 자연어로 요약 및 설명합니다.",
  "키워드 중심": "선택한 주제에 대해 키워드와 핵심 주제 위주로 간략하게 정리합니다."
};

function RagDropzone({ onFile, lang }: { onFile: (file: File) => void; lang: string }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"], "text/plain": [".txt"] },
    multiple: false,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles[0]) onFile(acceptedFiles[0]);
    }
  });
  return (
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
        {isDragActive ? TEXT.drag_drop[lang] : TEXT.doc_formats[lang]}
      </p>
    </div>
  );
}

// 모달 컴포넌트 (간단 버전)
function SaveQAModal({ open, onClose, onSave, question, answer, fileName }: { open: boolean, onClose: () => void, onSave: (title: string, description: string) => void, question: string, answer: string, fileName: string }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-lg font-bold mb-2">질의응답 저장</h2>
        <div className="mb-2 text-xs text-gray-500">파일명: {fileName}</div>
        <div className="mb-2 text-sm font-semibold">Q: {question}</div>
        <div className="mb-2 text-sm">A: {answer}</div>
        <input className="w-full border rounded px-2 py-1 mb-2" placeholder="제목" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea className="w-full border rounded px-2 py-1 mb-2" placeholder="설명(선택)" value={description} onChange={e => setDescription(e.target.value)} />
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={onClose}>취소</Button>
          <Button size="sm" onClick={() => { onSave(title, description); onClose(); }}>저장</Button>
        </div>
      </div>
    </div>
  );
}

export default function FGIAnalysisPage() {
  const { lang } = useLanguage();
  const { user, loading: authLoading } = useAuth('/FGI');
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string>("");
  const [summaryResult, setSummaryResult] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [analysisMode, setAnalysisMode] = useState<'audio' | 'doc-summary' | 'doc-rag' | 'topic-analysis'>('audio');
  const [sidebarWidth, setSidebarWidth] = useState(340);
  const dragging = useRef(false);
  const [showChunks, setShowChunks] = useState(false);
  const [totalChunks, setTotalChunks] = useState<number>(0);
  const [currentChunk, setCurrentChunk] = useState<number>(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [progressType, setProgressType] = useState<'chunk' | 'final' | 'other'>('chunk');
  const [subjectSummary, setSubjectSummary] = useState<string | null>(null);
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [ragQuestion, setRagQuestion] = useState("");
  const [ragChat, setRagChat] = useState<{role: 'user'|'assistant', content: string}[]>([]);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragFileId, setRagFileId] = useState<string | null>(null);
  const [docSummaryFile, setDocSummaryFile] = useState<File | null>(null);
  const [docSummaryPreview, setDocSummaryPreview] = useState<string>("");
  const [docSummaryLoading, setDocSummaryLoading] = useState(false);
  const [ragChatGroupId, setRagChatGroupId] = useState<string | null>(null);
  // 청킹 및 분석 진행상황 상태 추가
  const [chunkProgress, setChunkProgress] = useState<{
    total: number;
    current: number;
    completed: number;
    summaries: Array<{chunk: number, summary: string, status: 'pending' | 'processing' | 'completed' | 'error'}>;
  }>({total: 0, current: 0, completed: 0, summaries: []});
  const [finalSummary, setFinalSummary] = useState<string>("");
  const [analysisPhase, setAnalysisPhase] = useState<'idle' | 'chunking' | 'analyzing' | 'finalizing' | 'completed'>('idle');
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);
  const [saveQAModal, setSaveQAModal] = useState<{open: boolean, q: string, a: string} | null>(null);
  const [savingQA, setSavingQA] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [fileNameForSave, setFileNameForSave] = useState<string>("");
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [guideFile, setGuideFile] = useState<File | null>(null);
  const [guideTopics, setGuideTopics] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [manualTopic, setManualTopic] = useState<string>("");
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideError, setGuideError] = useState<string | null>(null);
  const [topicResults, setTopicResults] = useState<{topic: string, result: string}[]>([]);
  const [fgiDocumentFile, setFgiDocumentFile] = useState<File | null>(null);
  const [fgiDocumentLoading, setFgiDocumentLoading] = useState(false);
  const [fgiDocumentId, setFgiDocumentId] = useState<string | null>(null);
  const [manualTopics, setManualTopics] = useState<string[]>([]);
  const [manualTopicInput, setManualTopicInput] = useState<string>("");
  const [analysisTone, setAnalysisTone] = useState<string>("설명 중심");

  const questionInputRef = useRef<HTMLTextAreaElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // useSearchParams를 useEffect에서 안전하게 사용
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setSearchParams(params);
    }
  }, []);

  // 전체 주제 배열 (추출 + 직접 입력)
  const allTopics = [...guideTopics, ...manualTopics];

  useEffect(() => {
    if (selectAllRef.current && allTopics && allTopics.length > 0) {
      selectAllRef.current.indeterminate =
        selectedTopics.length > 0 && selectedTopics.length < allTopics.length;
    }
  }, [selectedTopics, allTopics]);

  const logProgress = (msg: string) => {
    const timestamp = new Date().toISOString();
    console.log(`[FGI][${timestamp}] ${msg}`);
  };

  // 파일 미리보기 생성 함수
  const generateFilePreview = async (file: File) => {
    console.log('generateFilePreview called', file);
    try {
      if (file.name.endsWith('.docx')) {
        // DOCX 파일을 직접 읽어서 미리보기 생성 (docx-preview 사용)
        const arrayBuffer = await file.arrayBuffer();
        const div = document.createElement('div');
        await renderAsync(arrayBuffer, div);
        
        // 모든 텍스트 노드를 순회하며 실제 텍스트만 추출
        const extractTextFromNode = (node: Node): string => {
          let text = '';
          
          if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent || '';
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            // 스타일이나 스크립트 태그는 건너뛰기
            if (element.tagName === 'STYLE' || element.tagName === 'SCRIPT') {
              return '';
            }
            
            // 자식 노드들을 순회
            for (let child of element.childNodes) {
              text += extractTextFromNode(child);
            }
          }
          
          return text;
        };
        
        const cleanText = extractTextFromNode(div).replace(/\s+/g, ' ').trim();
        const previewText = cleanText.substring(0, 1000);
        setDocSummaryPreview(previewText + (cleanText.length > 1000 ? '...' : ''));
        console.log('setDocSummaryPreview', previewText);
      } else {
        // TXT 파일은 기존 방식 사용
        const text = await file.text();
        setDocSummaryPreview(text.substring(0, 1000) + (text.length > 1000 ? '...' : ''));
      }
    } catch (error) {
      console.error('파일 미리보기 오류:', error);
      setDocSummaryPreview('파일 미리보기를 생성할 수 없습니다.');
    }
  };

  const getProgressType = (progressMsg: string) => {
    if (progressMsg.includes('메가청크')) return 'chunk';
    if (progressMsg.includes('최종 요약')) return 'final';
    return 'other';
  };

  const setProgressAndLog = (msg: string) => {
    setProgress(msg);
    logProgress(msg);
    // 진행상황 타입 구분
    const type = getProgressType(msg);
    setProgressType(type);
    if (type === 'chunk') {
      // 기존 청크 파싱
      const totalMatch = msg.match(/총 청크: (\d+)/);
      if (totalMatch) setTotalChunks(Number(totalMatch[1]));
      const chunkMatch = msg.match(/청크 (\d+)(?:\/(\d+))?/);
      if (chunkMatch) {
        setCurrentChunk(Number(chunkMatch[1]));
        if (chunkMatch[2]) setTotalChunks(Number(chunkMatch[2]));
      }
    }
    
    // 청킹 진행상황 업데이트
    updateChunkProgress(msg);
  };
  
  // 청킹 진행상황 업데이트 함수
  const updateChunkProgress = (msg: string) => {
    // 총 청크 수 파싱
    const totalMatch = msg.match(/총 (\d+)개 메가 청크 생성 완료/);
    if (totalMatch) {
      const total = Number(totalMatch[1]);
      setChunkProgress(prev => ({
        ...prev,
        total: total,
        summaries: Array.from({length: total}, (_, i) => ({
          chunk: i + 1,
          summary: '',
          status: 'pending' as const
        }))
      }));
      setAnalysisPhase('analyzing');
    }
    
    // 현재 청크 파싱
    const chunkMatch = msg.match(/청크 (\d+)\/(\d+) 분석 중/);
    if (chunkMatch) {
      const current = Number(chunkMatch[1]);
      const total = Number(chunkMatch[2]);
      setChunkProgress(prev => ({
        ...prev,
        current: current,
        total: total
      }));
    }
    
    // 청크 완료 파싱 (LLM 요약 완료)
    if (msg.includes('LLM 요약 완료')) {
      setChunkProgress(prev => {
        const newSummaries = [...prev.summaries];
        if (prev.current > 0 && prev.current <= newSummaries.length) {
          newSummaries[prev.current - 1] = {
            ...newSummaries[prev.current - 1],
            status: 'completed',
            summary: `청크 ${prev.current} 분석 완료` // 실제 요약은 백엔드에서 받아야 함
          };
        }
        return {
          ...prev,
          completed: prev.completed + 1,
          summaries: newSummaries
        };
      });
    }
    
    // 최종 요약 시작
    if (msg.includes('최종 요약 생성 중')) {
      setAnalysisPhase('finalizing');
    }
  };

  // 연속된 줄바꿈을 하나로 치환하는 함수
  const cleanText = (text: string) => text.replace(/\n{2,}/g, '\n');

  const onDropAudio = (acceptedFiles: File[]) => { setAudioFiles(acceptedFiles); setError(""); };
  const onDropDocs = (acceptedFiles: File[]) => { 
    setDocFiles(acceptedFiles); 
    setError(""); 
    // 파일 미리보기는 handleDocUpload에서 처리
  };

  const { getRootProps: getAudioRootProps, getInputProps: getAudioInputProps, isDragActive: isAudioDragActive } = useDropzone({
    onDrop: onDropAudio,
    accept: { 'audio/mpeg': ['.mp3'], 'audio/wav': ['.wav'], 'audio/mp4': ['.m4a'] },
    multiple: true
  });
  const { getRootProps: getDocRootProps, getInputProps: getDocInputProps, isDragActive: isDocDragActive } = useDropzone({
    onDrop: (acceptedFiles) => { if (acceptedFiles[0]) handleDocUpload(acceptedFiles[0]); },
    accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt'] },
    multiple: true
  });

  const { getRootProps: getFgiDocRootProps, getInputProps: getFgiDocInputProps, isDragActive: isFgiDocDragActive } = useDropzone({
    onDrop: (acceptedFiles) => { if (acceptedFiles[0]) handleFgiDocumentUpload(acceptedFiles[0]); },
    accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt'] },
    multiple: false
  });

  const chunkText = (text: string, maxLen = 2000) => {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
      chunks.push(text.slice(i, i + maxLen));
      i += maxLen;
    }
    return chunks;
  };

  // 분석 진행상황 WebSocket 연결
  useEffect(() => {
    if (!isProcessing || !jobId) return;
    // ws://localhost:8000/ws/fgi-progress/{job_id}
    const wsUrl = (process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8000").replace(/^http/, 'ws') + `/ws/fgi-progress/${jobId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = () => {
      console.log('WebSocket 연결 성공'); // 디버깅 로그 추가
      // 연결 유지용 ping
      const ping = setInterval(() => ws.send('ping'), 30000);
      ws.onclose = () => {
        console.log('WebSocket 연결 종료'); // 디버깅 로그 추가
        clearInterval(ping);
      };
    };
    ws.onmessage = (event) => {
      console.log('WebSocket 메시지 수신:', event.data); // 디버깅 로그 추가
      try {
        const data = JSON.parse(event.data);
        console.log('파싱된 WebSocket 데이터:', data); // 디버깅 로그 추가
        
        // 진행 상황 업데이트
        if (data.current !== undefined && data.total !== undefined) {
          setChunkProgress(prev => ({
            ...prev,
            current: data.current,
            total: data.total,
            completed: data.current,
          }));
        }
        
        // 청크 요약 실시간 반영
        if (data.chunk_index !== undefined && data.chunk_summary !== undefined) {
          setChunkProgress(prev => {
            const newSummaries = [...prev.summaries];
            // chunk는 1부터, index는 0부터이므로 +1
            const chunkNum = data.chunk_index + 1;
            const existingIdx = newSummaries.findIndex(s => s.chunk === chunkNum);
            if (existingIdx !== -1) {
              newSummaries[existingIdx] = {
                ...newSummaries[existingIdx],
                summary: data.chunk_summary,
                status: data.progress?.includes('실패') ? 'error' : 'completed'
              };
            } else {
              newSummaries.push({
                chunk: chunkNum,
                summary: data.chunk_summary,
                status: data.progress?.includes('실패') ? 'error' : 'completed'
              });
            }
            // chunk 번호순 정렬
            newSummaries.sort((a, b) => a.chunk - b.chunk);
            return {
              ...prev,
              summaries: newSummaries
            };
          });
        }
        
        // 진행 메시지 업데이트
        if (data.progress) {
          setProgress(data.progress);
          console.log('진행 상황 업데이트:', data.progress); // 디버깅 로그 추가
        }
        
        // 최종 요약 업데이트
        if (data.final_summary) {
          setFinalSummary(data.final_summary);
          console.log('최종 요약 업데이트:', data.final_summary); // 디버깅 로그 추가
        }
        
        // 분석 완료 시 처리
        if (data.progress === "완료!" || data.progress === "에러 발생") {
          console.log('분석 완료 또는 에러 발생'); // 디버깅 로그 추가
          setIsProcessing(false);
          ws.close();
        }
      } catch (e) {
        console.error('WebSocket 메시지 파싱 오류:', e); // 에러 로그 추가
      }
    };
    ws.onerror = (error) => {
      console.error('WebSocket 에러:', error); // 디버깅 로그 추가
      ws.close();
    };
    return () => {
      ws.close();
    };
  }, [isProcessing, jobId]);

  const handleStop = async () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (jobId) {
      await fetch(`/api/fgi-analysis?jobId=${jobId}`, { method: 'DELETE' });
    }
    // 상태 초기화
    setIsProcessing(false);
    setProgress("");
    setCurrentChunk(0);
    setTotalChunks(0);
    setJobId(null);
    setAudioFiles([]);
    setDocFiles([]);
    setSummaryResult(null);
    setError("");
  };

  const handleAnalyze = async () => {
    if ((analysisMode === 'audio' && audioFiles.length === 0) || (analysisMode === 'doc-summary' && docFiles.length === 0)) {
      setError("분석할 파일을 업로드해주세요.");
      return;
    }
    setIsProcessing(true);
    setIsTranscribing(false);
    setIsAnalyzing(false);
    setError("");
    setProgress("");
    setShowChunks(false);
    setTotalChunks(0);
    setSummaryResult(null);
    setCurrentChunk(0);
    setJobId(null);
    setChunkProgress({total: 0, current: 0, completed: 0, summaries: []});
    setFinalSummary("");
    setAnalysisPhase('idle');
    try {
      let file: File;
      if (analysisMode === 'audio') {
        file = audioFiles[0];
      } else {
        file = docFiles[0];
      }
      const formData = new FormData();
      formData.append("file", file);
      if (user?.id) {
        formData.append("user_id", user.id);
      }
      // job_id 생성 및 전달
      const job_id = crypto.randomUUID();
      setJobId(job_id);
      formData.append("job_id", job_id);
      const baseUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/api/v1/fgi/analyze`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FGI API 호출 실패: ${errorText}`);
      }
      const result = await response.json();
      console.log('FGI 분석 응답:', result); // 디버깅용 로그 추가
      if (result.success) {
        setSummaryResult({
          summary: result.final_summary,
          chunk_summaries: result.chunk_summaries || []
        });
        setFinalSummary(result.final_summary || "");
        if (result.chunk_details && Array.isArray(result.chunk_details)) {
          setChunkProgress(prev => ({
            ...prev,
            summaries: result.chunk_details.map((detail: any, index: number) => ({
              chunk: index + 1,
              summary: detail.summary || '',
              status: 'completed' as const
            })),
            completed: result.chunk_details.length,
            current: 0
          }));
        }
        setProgress("분석 완료!");
        setAnalysisPhase('completed');
      } else {
        throw new Error(result.error || "FGI 분석 중 오류가 발생했습니다.");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'FGI 분석 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!user || !summaryResult || !title.trim()) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('세션이 만료되었습니다.');
      const response = await fetch('/api/fgi-analyses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          audio_files_count: audioFiles.length,
          doc_files_count: docFiles.length,
          summary_result: summaryResult
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '저장 중 오류가 발생했습니다.');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      setError(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

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

  // 문서 업로드 및 임베딩 저장
  async function handleRagDocUpload(file: File) {
    setRagLoading(true);
    const formData = new FormData();
    formData.append('document', file);
    formData.append('user_id', user?.id || "");
    const fileId = crypto.randomUUID();
    formData.append('file_id', fileId);
    setRagFileId(null);
    const res = await fetch('/api/fgi-analysis/upload', { method: 'POST', body: formData });
    setRagLoading(false);
    const data = await res.json();
    if (data.alreadyExists) {
      setRagFileId(data.file_id);
      alert('이미 임베딩된 파일입니다. 바로 질의응답을 시작할 수 있습니다!');
      return;
    }
    if (!res.ok) {
      alert('문서 임베딩 저장 실패');
      return;
    }
    setRagFileId(fileId);
  }

  // RAG 질의응답
  async function handleRagAsk() {
    if (!ragFileId || !ragQuestion) return;
    setRagLoading(true);
    setRagChat((prev) => [...prev, { role: 'user', content: ragQuestion }]);
    const res = await fetch('/api/fgi-analysis/rag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user?.id || "",
        file_id: ragFileId,
        question: ragQuestion,
        chat_history: ragChat,
        chat_group_id: ragChatGroupId,
      })
    });
    setRagLoading(false);
    if (!res.ok) {
      setRagChat((prev) => [...prev, { role: 'assistant', content: '답변 생성 실패' }]);
      return;
    }
    const data = await res.json();
    setRagChat((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    setRagQuestion("");
    if (data.chat_group_id) setRagChatGroupId(data.chat_group_id);
  }

  // 파일 업로드 핸들러
  async function handleDocUpload(file: File) {
    console.log('handleDocUpload called', file);
    setDocFiles([file]);
    setDocSummaryPreview('');

    if (file.name.endsWith('.txt')) {
      // TXT 파일은 직접 읽어서 미리보기
      const text = await file.text();
      setDocSummaryPreview(text.substring(0, 1000) + (text.length > 1000 ? '...' : ''));
      console.log('setDocSummaryPreview (txt)', text.substring(0, 1000));
    } else if (file.name.endsWith('.docx')) {
      // DOCX 파일은 generateFilePreview에서 미리보기 생성
      await generateFilePreview(file);
    }
  }

  // FGI 문서 업로드 핸들러 (주제별 분석용)
  async function handleFgiDocumentUpload(file: File) {
    setFgiDocumentLoading(true);
    setFgiDocumentFile(file);
    setFgiDocumentId(null);
    
    const formData = new FormData();
    formData.append('document', file);
    formData.append('user_id', user?.id || "");
    const fileId = crypto.randomUUID();
    formData.append('file_id', fileId);
    
    try {
      const res = await fetch('/api/fgi-analysis/upload', { 
        method: 'POST', 
        body: formData 
      });
      
      const data = await res.json();
      
      if (data.alreadyExists) {
        setFgiDocumentId(data.file_id);
        console.log('이미 임베딩된 FGI 문서입니다. 바로 분석을 시작할 수 있습니다!');
      } else if (!res.ok) {
        console.error('FGI 문서 임베딩 저장 실패');
        setFgiDocumentFile(null);
    } else {
        setFgiDocumentId(fileId);
        console.log('FGI 문서 임베딩 완료');
      }
    } catch (error) {
      console.error('FGI 문서 업로드 오류:', error);
      setFgiDocumentFile(null);
    } finally {
      setFgiDocumentLoading(false);
    }
  }

  // 가이드라인 파일 업로드 핸들러
  async function handleGuideUpload(file: File) {
    setGuideLoading(true);
    setGuideError(null);
    setGuideFile(file);
    setGuideTopics([]);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${baseUrl}/api/v1/fgi/extract-guide-subjects`, { 
        method: 'POST', 
        body: formData 
      });
      
      if (!res.ok) {
        throw new Error('가이드라인에서 주제 추출 실패');
      }
      
      const data = await res.json();
      setGuideTopics(data.subjects || []);
      console.log('추출된 주제들:', data.subjects);
    } catch (error) {
      console.error('가이드라인 업로드 오류:', error);
      setGuideError(error instanceof Error ? error.message : '가이드라인 처리 중 오류가 발생했습니다.');
      setGuideFile(null);
    } finally {
      setGuideLoading(false);
    }
  }

  // RAG 대화 이력 불러오기 (세션별)
  async function loadRagChatHistory(groupId?: string) {
    if (!user || !ragFileId) return;
    const params = new URLSearchParams({
      user_id: user.id,
      file_id: ragFileId,
    });
    if (groupId) params.append('chat_group_id', groupId);
    const res = await fetch(`/api/fgi-analysis/rag?${params.toString()}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.chat && data.chat.length > 0) {
      setRagChat(data.chat.map((row: any) => ({ role: row.role, content: row.content })));
      setRagChatGroupId(data.chat[0].chat_group_id);
    }
  }

  // 저장된 Q&A 불러오기
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams({ user_id: user.id, favorites: '1' });
    fetch(`/api/fgi-analysis/rag?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.favorites) setFavorites(data.favorites);
      });
  }, [user]);

  // 쿼리스트링 진입 시 자동 세팅
  useEffect(() => {
    const fileId = searchParams?.get('file_id');
    const groupId = searchParams?.get('chat_group_id');
    if (fileId) {
      setAnalysisMode('doc-rag');
      setRagFileId(fileId);
    }
    if (groupId) {
      setRagChatGroupId(groupId);
      // fileId와 groupId가 모두 있으면 대화 이력 자동 불러오기
      if (fileId) loadRagChatHistory(groupId);
    }
  }, [searchParams]);

  // 답변 저장 함수
  async function handleSaveQA(q: string, a: string, title: string, description: string) {
    if (!user || !ragFileId || !ragChatGroupId) return;
    setSavingQA(true);
    // 파일명 가져오기
    let fileName = fileNameForSave;
    if (!fileName) {
      const { data } = await supabase.from('fgi_doc_embeddings').select('file_name').eq('file_id', ragFileId).limit(1).single();
      fileName = data?.file_name || '';
      setFileNameForSave(fileName);
    }
    await supabase.from('fgi_rag_favorites').insert({
      user_id: user.id,
      file_id: ragFileId,
      file_name: fileName,
      chat_group_id: ragChatGroupId,
      question: q,
      answer: a,
      title,
      description
    });
    setSavingQA(false);
  }

  // 복사 함수
  function handleCopyQA(q: string, a: string) {
    const text = `Q: ${q}\nA: ${a}`;
    navigator.clipboard.writeText(text);
    setCopySuccess(q);
    setTimeout(() => setCopySuccess(null), 1200);
  }

  // 주제별 분석 실행 핸들러
  const handleTopicAnalysis = async () => {
    if (!fgiDocumentId || selectedTopics.length === 0) {
      alert('FGI 문서와 분석할 주제를 선택해주세요.');
      return;
    }
    setTopicResults([]);
    const formData = new FormData();
    formData.append('file_id', fgiDocumentId);
    formData.append('topics', JSON.stringify([...selectedTopics, ...manualTopics]));
    if (user?.id) {
      formData.append('user_id', user.id);
    }
    formData.append('analysis_tone', analysisTone);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${baseUrl}/api/fgi-topic-analysis`, { 
        method: 'POST', 
        body: formData 
      });
      
      if (!res.ok) {
        throw new Error('주제별 분석 실패');
      }
      
      const data = await res.json();
      setTopicResults(data.results || []);
      console.log('주제별 분석 결과:', data.results);
    } catch (error) {
      console.error('주제별 분석 오류:', error);
      alert(error instanceof Error ? error.message : '주제별 분석 중 오류가 발생했습니다.');
    }
  };

  // 주제 체크박스 토글 핸들러
  function handleTopicCheckbox(topic: string) {
    setSelectedTopics(prev =>
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  }

  useEffect(() => {
    // 분석 방식이 바뀌면 결과 상태 초기화
    setSummaryResult(null);
    setFinalSummary("");
    setChunkProgress({ total: 0, current: 0, completed: 0, summaries: [] });
  }, [analysisMode]);

  if (authLoading) {
    return (
      <div className="w-full max-w-screen-xl px-8 py-12 mx-auto dark:bg-gray-900 dark:text-gray-100">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">인증 확인 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-row dark:bg-gray-900 dark:text-gray-100">
      <aside
        className="min-h-screen bg-white shadow-lg flex flex-col px-6 py-8 border-r border-gray-200 sticky top-0 z-10 overflow-y-auto dark:bg-gray-950 dark:border-gray-800"
        style={{ width: sidebarWidth, minWidth: 240, maxWidth: 600, transition: dragging.current ? 'none' : 'width 0.2s' }}
      >
        <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium mb-8">← {TEXT.back_to_home[lang]}</Link>
        <LanguageSwitcher />
        <h1 className="text-2xl font-bold mb-4 mt-6">{TEXT.title[lang]}</h1>
        <p className="mb-8 text-gray-700 text-base dark:text-gray-200">{MODE_TOP_DESC[analysisMode]}</p>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>분석 방식 선택</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <label className="flex flex-row items-center cursor-pointer gap-2">
                <input
                  type="radio"
                  name="analysisMode"
                  value="audio"
                  checked={analysisMode === "audio"}
                  onChange={() => setAnalysisMode('audio')}
                />
                <span>음성 요약</span>
              </label>
              {analysisMode === 'audio' && (
                <div className="ml-6 mt-1 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">음성 파일을 업로드하면 자동으로 텍스트로 변환하여 FGI 회의 내용을 분석합니다.</div>
              )}
              <label className="flex flex-row items-center cursor-pointer gap-2">
                <input
                  type="radio"
                  name="analysisMode"
                  value="doc-summary"
                  checked={analysisMode === "doc-summary"}
                  onChange={() => setAnalysisMode('doc-summary')}
                />
                <span>문서 요약</span>
              </label>
              {analysisMode === 'doc-summary' && (
                <div className="ml-6 mt-1 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">FGI 회의록 등 텍스트 문서를 업로드하면 주요 내용을 요약 분석합니다.</div>
              )}
              <label className="flex flex-row items-center cursor-pointer gap-2">
                <input
                  type="radio"
                  name="analysisMode"
                  value="doc-rag"
                  checked={analysisMode === "doc-rag"}
                  onChange={() => setAnalysisMode('doc-rag')}
                />
                <span>문서 질의응답(RAG)</span>
              </label>
              {analysisMode === 'doc-rag' && (
                <div className="ml-6 mt-1 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">문서 기반 질의응답(RAG) 모드입니다. 업로드한 문서에서 원하는 질문을 입력하면 AI가 답변을 생성합니다.</div>
              )}
              <label className="flex flex-row items-center cursor-pointer gap-2">
                <input
                  type="radio"
                  name="analysisMode"
                  value="topic-analysis"
                  checked={analysisMode === "topic-analysis"}
                  onChange={() => setAnalysisMode('topic-analysis')}
                />
                <span>주제별 분석</span>
              </label>
              {analysisMode === 'topic-analysis' && (
                <div className="ml-6 mt-1 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                  FGI 가이드라인에서 주제를 추출하여 원하는 주제별로 분석을 진행합니다. 가이드라인 파일(docx) 업로드 후 주제를 선택하거나 직접 입력할 수 있습니다.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        {/* RAG 모드에서만 문서 업로드 UI를 사이드바에 항상 표시 */}
        {analysisMode === "doc-rag" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                {TEXT.doc_upload[lang]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RagDropzone onFile={handleRagDocUpload} lang={lang} />
              {ragLoading && <div className="text-sm text-gray-500 mt-2">문서 임베딩 중...</div>}
            </CardContent>
          </Card>
        )}
        {/* topic-analysis 모드일 때만 파일 업로드 UI 추가 */}
        {analysisMode === "topic-analysis" && (
          <>
            {/* FGI 문서 업로드 UI (topic-analysis) */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  FGI 문서 파일 업로드 (필수)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                  {...getFgiDocRootProps()}
                className={`mt-2 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    isFgiDocDragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                    : 'border-gray-300 hover:border-gray-400 dark:border-gray-600'
                }`}
              >
                  <input {...getFgiDocInputProps()} />
                  <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    {isFgiDocDragActive ? TEXT.drag_drop[lang] : TEXT.doc_formats[lang]}
                </p>
              </div>
                {fgiDocumentFile && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900 dark:border-green-700">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm text-green-800 dark:text-green-200">
                        FGI 문서 파일 업로드됨: {fgiDocumentFile.name}
                    </span>
                  </div>
                </div>
              )}
                {fgiDocumentLoading && (
                  <div className="text-sm text-gray-500 mt-2">FGI 문서 임베딩 중...</div>
                )}
            </CardContent>
          </Card>
            {/* 가이드라인 파일 업로드 UI (topic-analysis) */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                  가이드라인 파일 업로드 (선택)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <RagDropzone onFile={handleGuideUpload} lang={lang} />
                {guideFile && guideFile.name && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900 dark:border-green-700 mt-2">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm text-green-800 dark:text-green-200">
                        가이드라인 파일 업로드됨: {guideFile.name}
                    </span>
                  </div>
                </div>
              )}
                {guideLoading && <div className="text-sm text-gray-500 mt-2">가이드라인에서 주제 추출 중...</div>}
                {guideError && <div className="text-sm text-red-500 mt-2">{guideError}</div>}
            </CardContent>
          </Card>
          </>
        )}
        {/* audio 모드일 때 파일 업로드 UI 추가 */}
        {analysisMode === "audio" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mic className="mr-2 h-5 w-5" />
                {TEXT.audio_upload[lang]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                {...getAudioRootProps()}
                className={`mt-2 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  isAudioDragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                    : 'border-gray-300 hover:border-gray-400 dark:border-gray-600'
                }`}
              >
                <input {...getAudioInputProps()} />
                <Mic className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {isAudioDragActive ? TEXT.drag_drop[lang] : TEXT.audio_formats[lang]}
                </p>
              </div>
              {audioFiles.length > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900 dark:border-green-700">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm text-green-800 dark:text-green-200">
                      음성 파일 업로드됨: {audioFiles.map(f => f.name).join(', ')}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {/* doc-summary 모드일 때 파일 업로드 UI 추가 */}
        {analysisMode === "doc-summary" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                {TEXT.doc_upload[lang]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                {...getDocRootProps()}
                className={`mt-2 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  isDocDragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                    : 'border-gray-300 hover:border-gray-400 dark:border-gray-600'
                }`}
              >
                <input {...getDocInputProps()} />
                <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {isDocDragActive ? TEXT.drag_drop[lang] : TEXT.doc_formats[lang]}
                </p>
              </div>
              {docFiles.length > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900 dark:border-green-700">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm text-green-800 dark:text-green-200">
                      문서 파일 업로드됨: {docFiles.map(f => f.name).join(', ')}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </aside>
      <main className="flex-1 flex flex-col px-12 py-10 min-h-screen dark:bg-gray-900 dark:text-gray-100">
        {/* 문서 요약(doc-summary) 모드 UI 추가 */}
        {analysisMode === "doc-summary" && (
          <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
            {/* 파일 미리보기 */}
            {docFiles.length > 0 && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>문서 미리보기</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-line text-sm text-gray-700 dark:text-gray-200">
                    {docSummaryPreview || "미리보기를 불러오는 중..."}
                  </div>
                </CardContent>
              </Card>
            )}
            {/* 분석 버튼 */}
            {docFiles.length > 0 && (
              <Button
                className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition"
                disabled={isProcessing}
                onClick={handleAnalyze}
              >
                {isProcessing ? '분석 중...' : '문서 요약 분석 실행'}
              </Button>
            )}
            
            {/* 분석 진행상황 */}
            {isProcessing && !finalSummary && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    분석 진행상황
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* 전체 진행률 */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>전체 진행률</span>
                        <span>{chunkProgress.completed}/{chunkProgress.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{width: `${chunkProgress.total > 0 ? (chunkProgress.completed / chunkProgress.total) * 100 : 0}%`}}
                        ></div>
                      </div>
                    </div>
                    
                    {/* 현재 분석 중인 청크 */}
                    {chunkProgress.current > 0 && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="font-medium">청크 {chunkProgress.current} 분석 중...</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {progress}
                        </div>
                      </div>
                    )}
                    
                    {/* 완료된 청크 요약들 */}
                    {chunkProgress.summaries.filter(s => s.status === 'completed').length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-800">완료된 청크 요약</h4>
                        <div className="max-h-64 overflow-y-auto space-y-3">
                          {chunkProgress.summaries
                            .filter(s => s.status === 'completed')
                                                         .map((summary, idx) => (
                               <div key={summary.chunk} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                 <div className="flex items-center gap-2 mb-2">
                                   <CheckCircle className="h-4 w-4 text-green-600" />
                                   <span className="font-medium">청크 {summary.chunk}</span>
                                 </div>
                                 <div className="text-sm text-gray-700 whitespace-pre-line">
                                   {summary.summary || `청크 ${summary.chunk} 분석 완료`}
                                 </div>
                               </div>
                             ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* 최종 분석 결과 */}
            {finalSummary && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    최종 분석 결과
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown>
                      {finalSummary}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* 기존 분석 결과 (하위 호환성) */}
            {summaryResult && !finalSummary && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>문서 요약 결과</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown>
                      {summaryResult.summary || summaryResult.final_summary || '분석 결과가 없습니다.'}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        {analysisMode === "topic-analysis" && guideTopics.length > 0 && (
          <>
            <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
              {/* 주제 선택 카드 */}
              <Card className="mb-4 w-full shadow-lg border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-blue-500" /> 추출된 주제 선택
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-6 px-8">
                  <div className="flex flex-col gap-4">
                    {/* 분석 분위기 선택 라디오 그룹 */}
                    <div className="flex flex-row gap-6 items-center mb-2">
                      <span className="font-semibold text-blue-700 dark:text-blue-200">분석 분위기:</span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="analysisTone" value="설명 중심" checked={analysisTone === "설명 중심"} onChange={() => setAnalysisTone("설명 중심")} className="accent-blue-500" />
                        <span>설명 중심</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="analysisTone" value="키워드 중심" checked={analysisTone === "키워드 중심"} onChange={() => setAnalysisTone("키워드 중심")} className="accent-blue-500" />
                        <span>키워드 중심</span>
                      </label>
                    </div>
                    {/* 선택된 분위기 설명 */}
                    <div className="mb-4 text-sm text-blue-500 dark:text-blue-300 min-h-[1.5em]">{TONE_DESCRIPTIONS[analysisTone]}</div>
                    <div className="flex flex-wrap items-center gap-4 mb-2">
                      <label className="font-medium flex items-center gap-2 text-blue-700 dark:text-blue-200 bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded shadow-sm cursor-pointer">
                        <input
                          type="checkbox"
                          ref={selectAllRef}
                          checked={selectedTopics.length === allTopics.length && allTopics.length > 0}
                          onChange={e => setSelectedTopics(e.target.checked ? allTopics : [])}
                          className="accent-blue-500 w-5 h-5"
                        />
                        전체 선택
                      </label>
                      <span className="text-sm text-gray-400">({selectedTopics.length} / {allTopics.length} 선택됨)</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {allTopics.map((topic, idx) => {
                        // 정규표현식으로 앞 숫자/기호 제거 (guideTopics만 적용, manualTopics는 그대로)
                        const isManual = idx >= guideTopics.length;
                        const cleanTopic = isManual ? topic : topic.replace(/^\s*[\d]+[.)\-:•▷]?\s*/, '');
                        return (
                          <label key={idx} className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-sm border border-blue-100 dark:border-blue-800 bg-white dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-800 transition cursor-pointer ${selectedTopics.includes(topic) ? 'ring-2 ring-blue-400' : ''}`}>
                            <input
                              type="checkbox"
                              checked={selectedTopics.includes(topic)}
                              onChange={() => handleTopicCheckbox(topic)}
                              className="accent-blue-500 w-5 h-5"
                            />
                            <span className="font-bold text-blue-700 dark:text-blue-200 mr-1">{idx + 1}.</span>
                            <span className="truncate font-medium text-blue-900 dark:text-blue-100">{cleanTopic}</span>
                            {isManual && (
                              <button onClick={e => { e.stopPropagation(); setManualTopics(prev => prev.filter((_, i) => i !== (idx - guideTopics.length))); setSelectedTopics(prev => prev.filter(t => t !== topic)); }} className="ml-2 text-blue-600 hover:text-red-500 font-bold text-lg" title="삭제">×</button>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* 직접 주제 입력 (input) */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full">
                <input
                  type="text"
                  className="border-2 border-blue-200 dark:border-blue-700 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-blue-900 dark:bg-gray-800 text-blue-100 shadow-sm"
                  placeholder="직접 주제 입력 후 Enter"
                  value={manualTopicInput}
                  onChange={e => setManualTopicInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.nativeEvent.isComposing) return;
                    if (e.key === 'Enter' && manualTopicInput.trim()) {
                      setManualTopics(prev => [...prev, manualTopicInput.trim()]);
                      setManualTopicInput("");
                    }
                  }}
                />
              </div>
              {/* 주제별 분석 실행 버튼 */}
              <div className="w-full flex">
                <Button
                  className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition"
                  disabled={selectedTopics.length === 0 || !fgiDocumentId || isProcessing}
                  onClick={handleTopicAnalysis}
                >
                  {isProcessing ? '분석 중...' : '주제별 분석 실행'}
                </Button>
              </div>
              {/* 주제별 분석 결과 */}
              {analysisMode === "topic-analysis" && topicResults.length > 0 && (
                <Card className="w-full mb-8">
                  <CardHeader>
                    <CardTitle>주제별 분석 결과</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {topicResults.map((tr, idx) => (
                        <div key={idx} className="bg-gray-50 p-4 rounded-lg border dark:bg-gray-800">
                          <div className="font-semibold mb-1">{idx + 1}. {tr.topic}</div>
                          <div className="text-sm whitespace-pre-line">{tr.result}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
        {analysisMode === 'doc-rag' && ragFileId && (
          <div className="w-full h-full flex flex-col" style={{ minHeight: '70vh' }}>
            <Card className="flex-1 flex flex-col h-full mb-6 w-full">
              <CardHeader>
                <CardTitle>질문을 입력하세요:</CardTitle>
                <Button size="sm" variant="outline" className="ml-2" onClick={() => loadRagChatHistory(ragChatGroupId || undefined)}>
                  이전 대화 불러오기
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 h-full p-0">
                <div className="flex-1 overflow-y-auto px-6 pt-6" style={{ minHeight: 0 }}>
                  {ragChat.map((msg, i) => {
                    const isUser = msg.role === 'user';
                    const isLast = i === ragChat.length - 1;
                    const isNextUser = ragChat[i + 1]?.role === 'user';
                    // 질문-답변 쌍 사이에 더 큰 여백
                    const marginClass = isUser
                      ? 'mb-2'
                      : isNextUser || isLast
                        ? 'mb-8 mt-2'
                        : 'mb-2 mt-2';
                    // Q&A 쌍: 직전 user/assistant
                    const prevMsg = ragChat[i - 1];
                    const isQAPair = msg.role === 'assistant' && prevMsg && prevMsg.role === 'user';
                    return (
                      <div key={i} className={marginClass + (isUser ? ' flex justify-end' : ' flex justify-start')}>
                        <div className={
                          (isUser
                            ? 'bg-blue-100 '
                            : 'bg-green-100 '
                          ) +
                          'px-2 py-1 rounded inline-block prose prose-sm dark:prose-invert text-left relative'
                        } style={{maxWidth: '80%', wordBreak: 'break-word', whiteSpace: 'pre-wrap'}}>
                          <span>{isUser ? '🙋‍♂️ ' : '🤖 '}</span>
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                          {/* Q&A 저장/복사 버튼 (assistant 답변에만) */}
                          {isQAPair && (
                            <div className="absolute top-1 right-1 flex gap-1">
                              <button title="저장" onClick={() => setSaveQAModal({open: true, q: prevMsg.content, a: msg.content})} className="p-1 rounded hover:bg-yellow-100"><Star className="w-4 h-4 text-yellow-500" /></button>
                              <button title="복사" onClick={() => handleCopyQA(prevMsg.content, msg.content)} className="p-1 rounded hover:bg-blue-100"><Copy className="w-4 h-4 text-blue-500" /></button>
                              {copySuccess === prevMsg.content && <span className="text-xs text-green-600 ml-1">복사됨!</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 p-6 border-t bg-white dark:bg-gray-900 sticky bottom-0">
                  <textarea
                    ref={questionInputRef}
                    className="flex-1 border rounded px-2 py-1 resize-none min-h-[120px] max-h-40 overflow-auto"
                    value={ragQuestion}
                    onChange={e => {
                      setRagQuestion(e.target.value);
                      if (questionInputRef.current) {
                        questionInputRef.current.style.height = 'auto';
                        questionInputRef.current.style.height = questionInputRef.current.scrollHeight + 'px';
                      }
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleRagAsk();
                      }
                    }}
                    disabled={ragLoading}
                    placeholder="질문을 입력하세요..."
                  />
                  <button
                    className="flex items-center justify-center w-10 h-10 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
                    title="저장된 Q&A 불러오기"
                    onClick={() => setShowFavoritesModal(true)}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <Button onClick={handleRagAsk} disabled={ragLoading || !ragQuestion}>질문</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {error && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="mr-2 h-5 w-5 text-red-600" />
                {TEXT.error[lang]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-red-700">{error}</div>
            </CardContent>
          </Card>
        )}
        {summaryResult && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                FGI 분석 결과
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg dark:bg-orange-900 dark:border-orange-700">
                <h4 className="font-medium text-orange-800 mb-3">💾 분석 결과 저장</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-orange-700">제목 *</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={TEXT.title_placeholder[lang]}
                      className="mt-1 w-full px-3 py-2 border rounded-md bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-orange-700">설명 (선택사항)</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={TEXT.description_placeholder[lang]}
                      rows={2}
                      className="mt-1 w-full px-3 py-2 border rounded-md bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                    />
                  </div>
                  <Button 
                    onClick={handleSave} 
                    disabled={saving || !title.trim()}
                    className="w-full"
                    variant={saved ? "default" : "outline"}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? TEXT.saving[lang] : saved ? TEXT.saved[lang] : TEXT.save[lang]}
                  </Button>
                </div>
              </div>
              <div className="mb-4">
                <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                  <FileText className="mr-2 h-4 w-4" />
                  📝 FGI 분석 요약
                </h4>
                <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto dark:bg-gray-800">
                  <div className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown>
                      {summaryResult.summary || summaryResult.final_summary || 'FGI 분석 내용이 없습니다.'}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                onClick={() => setShowChunks(v => !v)}
              >
                  {showChunks ? "청크별 요약 숨기기" : "청크별 요약 보기"}
                </Button>
              </div>
              {showChunks && summaryResult.chunk_summaries && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    📝 청크별 요약
                  </h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {summaryResult.chunk_summaries && Array.isArray(summaryResult.chunk_summaries) && summaryResult.chunk_summaries.map((chunk: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg dark:bg-gray-800">
                        <h4 className="font-medium mb-2">청크 {index + 1}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {typeof chunk === 'string' ? chunk.substring(0, 200) : String(chunk || '').substring(0, 200)}...
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        )}
        {/* 저장된 Q&A 불러오기 모달 */}
        {showFavoritesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <h2 className="text-lg font-bold mb-4 flex items-center">⭐ 저장된 Q&A 불러오기</h2>
              {favorites.length === 0 ? (
                <div className="text-gray-500 text-center py-8">저장된 Q&A가 없습니다.</div>
              ) : (
                <ul className="space-y-4">
                  {favorites.map((fav, idx) => (
                    <li key={fav.id || idx} className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                      <div className="font-semibold mb-1">{fav.title || '제목 없음'}</div>
                      <div className="text-xs text-gray-500 mb-1">{fav.file_name}</div>
                      <div className="mb-1"><span className="font-bold">Q:</span> {fav.question}</div>
                      <div className="mb-2"><span className="font-bold">A:</span> {fav.answer}</div>
                      {fav.description && <div className="text-xs text-gray-400 mb-1">{fav.description}</div>}
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => { setRagQuestion(fav.question); setShowFavoritesModal(false); }}>이 질문 사용</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setRagQuestion(fav.question); setRagChat((prev) => [...prev, { role: 'user', content: fav.question }, { role: 'assistant', content: fav.answer }]); setShowFavoritesModal(false); }}>Q&A 대화로 추가</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-end mt-6">
                <Button size="sm" variant="outline" onClick={() => setShowFavoritesModal(false)}>닫기</Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 