export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { OpenAI } from 'openai';
import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 서버에서만 사용!
);

// jobId별 AbortController 관리
const jobControllers = new Map();

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function isAudio(mimetype: string) {
  return mimetype.startsWith('audio/');
}
function isDocx(mimetype: string) {
  return mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}
function isTxt(mimetype: string) {
  return mimetype === 'text/plain';
}

function chunkText(text: string, maxLen = 2000) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + maxLen));
    i += maxLen;
  }
  return chunks;
}

// 3개씩 묶어서 합치는 함수
function mergeChunks(chunks: string[], groupSize = 3) {
  const merged = [];
  for (let i = 0; i < chunks.length; i += groupSize) {
    let mergedChunk = chunks[i];
    for (let j = 1; j < groupSize; j++) {
      if (chunks[i + j]) mergedChunk += '\n' + chunks[i + j];
    }
    merged.push(mergedChunk);
  }
  return merged;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const guideFile = formData.get('guide');
    if (!file || typeof file === 'string') {
      // console.log('[FGI] No file uploaded');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    // 파일 정보 추출
    const mimetype = (file as File).type;
    const filename = (file as File).name;
    let text = '';
    if (isAudio(mimetype)) {
      // console.log('[FGI] 오디오 파일로 Whisper STT 시작');
      const arrayBuffer = await (file as Blob).arrayBuffer();
      const audioData = Buffer.from(arrayBuffer);
      const openai = getOpenAI();
      const resp = await openai.audio.transcriptions.create({
        file: new File([audioData], filename || 'audio.wav'),
        model: 'whisper-1',
        response_format: 'text',
      });
      text = typeof resp === 'string' ? resp : (resp as any).text || '';
      // console.log('[FGI] Whisper STT 완료');
    } else if (isDocx(mimetype)) {
      // console.log('[FGI] docx 파일 파싱 시작');
      const arrayBuffer = await (file as Blob).arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
      // console.log('[FGI] docx 파싱 완료');
    } else if (isTxt(mimetype)) {
      // console.log('[FGI] txt 파일 파싱 시작');
      const arrayBuffer = await (file as Blob).arrayBuffer();
      text = Buffer.from(arrayBuffer).toString('utf-8');
      // console.log('[FGI] txt 파싱 완료');
    } else {
      // console.log('[FGI] 지원하지 않는 파일 형식');
      return NextResponse.json({ error: '지원하지 않는 파일 형식입니다.' }, { status: 400 });
    }
    // 가이드라인 파일 파싱(선택)
    let guideText = '';
    if (guideFile && typeof guideFile !== 'string') {
      const guideMimetype = (guideFile as File).type;
      // console.log(`[FGI] 가이드라인 파일 수신: ${(guideFile as File).name}, 타입: ${guideMimetype}`);
      if (isDocx(guideMimetype)) {
        // console.log('[FGI] 가이드라인 docx 파싱 시작');
        const arrayBuffer = await (guideFile as Blob).arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const result = await mammoth.extractRawText({ buffer });
        guideText = result.value;
        // console.log('[FGI] 가이드라인 docx 파싱 완료');
      }
    }
    // chunking
    const baseChunks = chunkText(text, 2000);
    const chunks = mergeChunks(baseChunks, 3);
    // console.log(`[FGI] chunk 개수: ${chunks.length}`);
    // jobId 생성 및 진행상황 초기화
    const jobId = crypto.randomUUID();
    const { error: insertError } = await supabase.from('fgi_progress').insert([
      { job_id: jobId, progress: '분석 대기 중...', current: 0, total: chunks.length, final_summary: null }
    ]);
    if (insertError) {
      return NextResponse.json({ error: 'Supabase insert 실패', detail: insertError.message }, { status: 500 });
    }
    // AbortController 생성 및 저장
    const controller = new AbortController();
    jobControllers.set(jobId, controller);
    // 비동기 분석 백그라운드 실행
    (async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const chunkSummaries = [];
        for (const [i, chunk] of chunks.entries()) {
          const msg = `[FGI] chunk ${i+1}/${chunks.length} LLM 요약 시작`;
          await supabase.from('fgi_progress').update({
            progress: msg,
            current: i + 1,
            total: chunks.length,
            updated_at: new Date().toISOString()
          }).eq('job_id', jobId);
          const response = await fetch(`${baseUrl}/api/openai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [
                { role: 'system', content: '다음 텍스트를 요약해줘.' },
                { role: 'user', content: chunk },
              ],
              model: 'gpt-4o',
              temperature: 0.3,
            }),
            signal: controller.signal
          });
          const data = await response.json();
          chunkSummaries.push(data.choices?.[0]?.message?.content);
          await supabase.from('fgi_progress').update({
            progress: `[FGI] chunk ${i+1} 요약 완료`,
            current: i + 1,
            total: chunks.length,
            updated_at: new Date().toISOString()
          }).eq('job_id', jobId);
        }
        
        // 전체 요약
        await supabase.from('fgi_progress').update({
          progress: '[FGI] 전체 chunk 요약 통합 LLM 분석 시작',
          updated_at: new Date().toISOString()
        }).eq('job_id', jobId);
        const finalSummaryRes = await fetch(`${baseUrl}/api/openai`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: '다음은 여러 텍스트 요약입니다. 전체 내용을 통합해 한글로 FGI 분석 요약을 작성해줘.' },
              { role: 'user', content: chunkSummaries.join('\n') },
            ],
            model: 'gpt-4o',
            temperature: 0.3,
          }),
          signal: controller.signal
        });
        const finalSummaryData = await finalSummaryRes.json();
        await supabase.from('fgi_progress').update({
          progress: '완료!',
          final_summary: finalSummaryData.choices?.[0]?.message?.content || null,
          chunk_summaries: chunkSummaries,
          updated_at: new Date().toISOString()
        }).eq('job_id', jobId);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          await supabase.from('fgi_progress').update({
            progress: '중단됨',
            updated_at: new Date().toISOString()
          }).eq('job_id', jobId);
        } else {
          await supabase.from('fgi_progress').update({
            progress: '에러 발생',
            updated_at: new Date().toISOString()
          }).eq('job_id', jobId);
        }
      } finally {
        jobControllers.delete(jobId);
      }
    })();
    // 즉시 jobId만 반환
    return NextResponse.json({ jobId });
  } catch (error) {
    console.error('FGI-analysis POST error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');
  const { data, error } = await supabase.from('fgi_progress').select('*').eq('job_id', jobId).single();
  if (!data) {
    return NextResponse.json({ error: "Not found", jobId }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');
  const controller = jobControllers.get(jobId);
  if (controller) {
    controller.abort();
    jobControllers.delete(jobId);
    await supabase.from('fgi_progress').update({
      progress: '중단됨',
      updated_at: new Date().toISOString()
    }).eq('job_id', jobId);
  }
  return NextResponse.json({ ok: true });
} 