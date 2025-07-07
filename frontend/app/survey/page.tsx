"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/components/LanguageContext';
type PlannerStep = "intro" | "audience" | "structure" | "question" | "validationChecklist";
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';

const TEXT = {
  title: { "한국어": "설문조사 계획 수립", "English": "Survey Planning" },
  desc: {
    "한국어": "AI가 설문조사 주제와 목적에 따라 설문 문항을 추천합니다. 아래에 주제와 목적을 입력해보세요.",
    "English": "AI recommends survey questions based on your topic and objectives. Enter them below."
  },
  topic: { "한국어": "설문조사 주제", "English": "Survey Topic" },
  topic_ph: { "한국어": "예: 고객 만족도 조사", "English": "e.g., Customer Satisfaction Survey" },
  objective: { "한국어": "연구 목적", "English": "Research Objectives" },
  objective_ph: { "한국어": "이 설문을 통해 얻고자 하는 목표를 입력하세요.", "English": "Describe the purpose and expected outcomes of this survey." },
  generate: { "한국어": "설문조사 설계 생성", "English": "Generate Survey Design" },
  save: { "한국어": "결과 저장", "English": "Save Result" },
  saved: { "한국어": "저장 완료!", "English": "Saved!" },
  result_title: { "한국어": "AI 설문조사 설계 결과", "English": "AI Survey Planning Result" },
  result_success: { "한국어": "✅ 설문조사 설계가 완료되었습니다!", "English": "✅ Survey planning completed!" },
  warning_topic: { "한국어": "📝 조사 주제를 입력해주세요.", "English": "📝 Please enter a survey topic." }
};

const PLANNER_STEPS: PlannerStep[] = [
  "intro",
  "audience",
  "structure",
  "question",
  "validationChecklist"
];

export default function SurveyPlanningPage() {
  const { lang } = useLanguage();
  const { user, loading: authLoading } = useAuth('/survey');
  const [topic, setTopic] = useState("");
  const [objective, setObjective] = useState("");
  const [plannerState, setPlannerState] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<PlannerStep | null>(null);
  const [stepStates, setStepStates] = useState<{step: PlannerStep, state: any}[]>([]);
  const [showMore, setShowMore] = useState<{[key: string]: boolean}>({});
  const [validationChecklist, setValidationChecklist] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const STEP_LABELS: Record<PlannerStep, string> = {
    intro: lang === "한국어" ? "설문 목적 생성" : "Generating Objective",
    audience: lang === "한국어" ? "타겟 응답자 생성" : "Generating Audience",
    structure: lang === "한국어" ? "설문 구조 생성" : "Generating Structure",
    question: lang === "한국어" ? "문항 생성" : "Generating Questions",
    validationChecklist: lang === "한국어" ? "설문 검증 체크리스트" : "Survey Validation Checklist",
  };

  const handleGenerate = async () => {
    if (!topic) {
      alert(TEXT.warning_topic[lang]);
      return;
    }
    setLoading(true);
    setError(null);
    setPlannerState(null);
    setCurrentStep(null);
    setStepStates([]);
    setValidationChecklist("");
    setSaved(false);
    try {
      // Python 백엔드 API 호출
      const formData = new FormData();
      formData.append("topic", topic);
      formData.append("objective", objective);
      formData.append("lang", lang);
      if (user?.id) {
        formData.append("user_id", user.id);
      }

      const baseUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/api/planner`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`설문 계획 생성 실패: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setPlannerState(result.result);
        setValidationChecklist(result.result.validation_checklist || "");
      } else {
        throw new Error(result.error || "설문 계획 생성 중 오류가 발생했습니다.");
      }
      
      setCurrentStep(null);
    } catch (e: any) {
      setError(e?.message || '에러가 발생했습니다.');
      setCurrentStep(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !plannerState) return;
    
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('세션이 만료되었습니다.');
      }

      const response = await fetch('/api/survey-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          topic,
          objective,
          generated_objective: plannerState.generated_objective,
          generated_audience: plannerState.audience,
          generated_structure: plannerState.structure,
          generated_questions: plannerState.questions,
          validation_checklist: validationChecklist,
          full_result: plannerState
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

  // 최신 중간 결과를 실시간으로 표시
  const latestState = stepStates.length > 0
    ? stepStates[stepStates.length - 1].state
    : plannerState;

  // 박스별 토글 핸들러
  const handleToggle = (key: string) => {
    setShowMore(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
    <div className="w-full max-w-screen-xl px-8 py-12 mx-auto dark:bg-gray-900 dark:text-gray-100">
      <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">← 홈으로</Link>
      <LanguageSwitcher />
      <h1 className="text-2xl font-bold mb-4">{TEXT.title[lang]} (Survey Planning)</h1>
      <p className="mb-4">{TEXT.desc[lang]}</p>
      <div className="bg-gray-50 p-8 rounded-lg border-2 shadow-lg text-gray-700 space-y-4 w-full dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100">
        {/* Progress Bar */}
        {loading && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-blue-700">
                {lang === "한국어" ? "진행률" : "Progress"}
              </span>
              <span className="text-xs text-gray-500">
                {stepStates.length} / {PLANNER_STEPS.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(stepStates.length / PLANNER_STEPS.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-300">
              {PLANNER_STEPS.map((step, idx) => (
                <span
                  key={step}
                  className={
                    idx < stepStates.length
                      ? "text-blue-700 font-semibold"
                      : idx === stepStates.length
                      ? "text-blue-500 font-bold animate-pulse"
                      : ""
                  }
                >
                  {STEP_LABELS[step]}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-4">
          <label className="block font-medium mb-1">{TEXT.topic[lang]}</label>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder={TEXT.topic_ph[lang]}
            className="w-full px-4 py-2 border rounded bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-400 dark:border-gray-700"
          />
          <label className="block font-medium mb-1">{TEXT.objective[lang]}</label>
          <textarea
            value={objective}
            onChange={e => setObjective(e.target.value)}
            placeholder={TEXT.objective_ph[lang]}
            className="w-full px-4 py-2 border rounded bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-400 dark:border-gray-700"
            rows={3}
          />
          <Button onClick={handleGenerate} className="w-full" disabled={loading}>
            🧠 {TEXT.generate[lang]}
          </Button>
        </div>
        {loading && (
          <div className="mb-4 text-blue-600 font-semibold">
            {lang === "한국어" ? "설문조사 설계 생성 중입니다..." : "Survey planning in progress..."}
          </div>
        )}
        {stepStates.length > 0 && (
          <div className="mb-4">
            <div className="font-semibold mb-1">{lang === "한국어" ? "단계별 중간 결과" : "Intermediate Results by Step"}</div>
            <ul className="text-xs text-gray-600 space-y-1">
              {stepStates.map(({step}, idx) => (
                <li key={idx}>
                  <span className="font-semibold">{STEP_LABELS[step]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {error && (
          <div className="mt-4 text-red-600">{error}</div>
        )}
        {(latestState || plannerState) && (
          <div className="mt-6">
            <h2 className="font-semibold mb-2 text-lg">{TEXT.result_title[lang]}</h2>
            {!loading && (
              <div className="text-green-700 font-bold mb-2">{TEXT.result_success[lang]}</div>
            )}
            {loading && (
              <div className="text-blue-600 font-semibold mb-2">{lang === "한국어" ? "설문조사 설계 진행 중..." : "Survey planning in progress..."}</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
              {/* 목적 */}
              <div className="bg-white border rounded shadow p-6 min-h-[180px] flex flex-col">
                <span className="font-semibold mb-2">목적</span>
                {typeof (latestState?.generated_objective || objective) === 'string' && (latestState?.generated_objective || objective).trim().length > 0 ? (
                  <div>
                    <div className={showMore['objective'] ? '' : 'max-h-48 overflow-hidden relative'}>
                      <ReactMarkdown>{latestState?.generated_objective || objective || ''}</ReactMarkdown>
                      {!showMore['objective'] && (
                        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent flex items-end justify-center pointer-events-none" />
                      )}
                    </div>
                    {(latestState?.generated_objective || objective || '').length > 300 && (
                      <button
                        className="mt-2 text-blue-600 underline text-xs"
                        onClick={() => handleToggle('objective')}
                      >
                        {showMore['objective'] ? (lang === '한국어' ? '간략히' : 'Show less') : (lang === '한국어' ? '더보기' : 'Show more')} ▼
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400 mt-2">{lang === "한국어" ? "실행 중..." : "In progress..."}</span>
                )}
              </div>
              {/* 타겟 응답자 */}
              <div className="bg-white border rounded shadow p-6 min-h-[180px] flex flex-col">
                <span className="font-semibold mb-2">타겟 응답자</span>
                {typeof latestState?.audience === 'string' && latestState.audience.trim().length > 0 ? (
                  <div>
                    <div className={showMore['audience'] ? '' : 'max-h-48 overflow-hidden relative'}>
                      <ReactMarkdown>{latestState.audience}</ReactMarkdown>
                      {!showMore['audience'] && (
                        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent flex items-end justify-center pointer-events-none" />
                      )}
                    </div>
                    {latestState.audience.length > 300 && (
                      <button
                        className="mt-2 text-blue-600 underline text-xs"
                        onClick={() => handleToggle('audience')}
                      >
                        {showMore['audience'] ? (lang === '한국어' ? '간략히' : 'Show less') : (lang === '한국어' ? '더보기' : 'Show more')} ▼
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400 mt-2">{lang === "한국어" ? "실행 중..." : "In progress..."}</span>
                )}
              </div>
              {/* 설문 구조 */}
              <div className="bg-white border rounded shadow p-6 min-h-[180px] flex flex-col">
                <span className="font-semibold mb-2">설문 구조</span>
                {typeof latestState?.structure === 'string' && latestState.structure.trim().length > 0 ? (
                  <div>
                    <div className={showMore['structure'] ? '' : 'max-h-48 overflow-hidden relative'}>
                      <ReactMarkdown>{latestState.structure}</ReactMarkdown>
                      {!showMore['structure'] && (
                        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent flex items-end justify-center pointer-events-none" />
                      )}
                    </div>
                    {latestState.structure.length > 300 && (
                      <button
                        className="mt-2 text-blue-600 underline text-xs"
                        onClick={() => handleToggle('structure')}
                      >
                        {showMore['structure'] ? (lang === '한국어' ? '간략히' : 'Show less') : (lang === '한국어' ? '더보기' : 'Show more')} ▼
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400 mt-2">{lang === "한국어" ? "실행 중..." : "In progress..."}</span>
                )}
              </div>
              {/* 예시 문항 */}
              <div className="bg-white border rounded shadow p-6 min-h-[180px] flex flex-col">
                <span className="font-semibold mb-2">예시 문항</span>
                {typeof latestState?.questions === 'string' && latestState.questions.trim().length > 0 ? (
                  <div>
                    <div className={showMore['questions'] ? '' : 'max-h-48 overflow-hidden relative'}>
                      <ReactMarkdown>{latestState.questions}</ReactMarkdown>
                      {!showMore['questions'] && (
                        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent flex items-end justify-center pointer-events-none" />
                      )}
                    </div>
                    {latestState.questions.length > 300 && (
                      <button
                        className="mt-2 text-blue-600 underline text-xs"
                        onClick={() => handleToggle('questions')}
                      >
                        {showMore['questions'] ? (lang === '한국어' ? '간략히' : 'Show less') : (lang === '한국어' ? '더보기' : 'Show more')} ▼
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400 mt-2">{lang === "한국어" ? "실행 중..." : "In progress..."}</span>
                )}
              </div>
              {/* 설문 검증 체크리스트 */}
              <div className="bg-white border rounded shadow p-6 min-h-[180px] flex flex-col">
                <span className="font-semibold mb-2">설문 검증 체크리스트</span>
                {typeof validationChecklist === 'string' && validationChecklist.trim().length > 0 ? (
                  <div>
                    <div className={showMore['validationChecklist'] ? '' : 'max-h-48 overflow-hidden relative'}>
                      <ReactMarkdown>{validationChecklist}</ReactMarkdown>
                      {!showMore['validationChecklist'] && (
                        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent flex items-end justify-center pointer-events-none" />
                      )}
                    </div>
                    {validationChecklist.length > 300 && (
                      <button
                        className="mt-2 text-blue-600 underline text-xs"
                        onClick={() => handleToggle('validationChecklist')}
                      >
                        {showMore['validationChecklist'] ? (lang === '한국어' ? '간략히' : 'Show less') : (lang === '한국어' ? '더보기' : 'Show more')} ▼
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400 mt-2">
                    {loading
                      ? (lang === "한국어" ? "실행 중..." : "In progress...")
                      : (lang === "한국어" ? "설문 검증 피드백이 없습니다." : "No validation feedback.")}
                  </span>
                )}
              </div>
              {/* 주제(항상 표시) */}
              <div className="bg-white border rounded shadow p-6 min-h-[180px] flex flex-col">
                <span className="font-semibold mb-2">주제</span>
                {typeof latestState?.topic === 'string' && latestState.topic.trim().length > 0 ? (
                  <span>{latestState.topic}</span>
                ) : (
                  <span className="text-gray-400 mt-2">{lang === "한국어" ? "실행 중..." : "In progress..."}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 