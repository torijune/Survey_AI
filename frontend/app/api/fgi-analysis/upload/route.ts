import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const EMBEDDING_MODEL = 'text-embedding-3-small';

function chunkText(text: string, chunkSize = 800, overlap = 200) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
}

async function getEmbedding(text: string) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: text,
      model: EMBEDDING_MODEL
    })
  });
  const data = await res.json();
  return data.data[0].embedding as number[];
}

// 발화자/질문-답변 단위로 청크를 나누는 함수
function chunkBySpeakerGroup(text: string, maxLen = 800, overlap = 200) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  let lastSpeaker = '';
  for (const line of lines) {
    // 화자명 추출 (예: "사회자 :", "참석자 :", "권태유 :", "이민영 :")
    const speakerMatch = line.match(/^([가-힣A-Za-z0-9]+) *:/);
    if (current.length + line.length > maxLen) {
      chunks.push(current.trim());
      // overlap: 마지막 overlap자만 남기고 새로 시작
      current = current.slice(-overlap) + '\n' + line;
    } else {
      current += (current ? '\n' : '') + line;
    }
    if (speakerMatch) lastSpeaker = speakerMatch[1];
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('document') as File;
    const user_id = formData.get('user_id') as string;
    const file_id = formData.get('file_id') as string;
    if (!file) {
      console.error('[UPLOAD][ERROR] 파일 없음');
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
    }
    const file_name = file.name;
    // 1. 이미 임베딩된 파일 이름인지 확인
    const { data: existing, error: checkError } = await supabase
      .from('fgi_doc_embeddings')
      .select('file_id')
      .eq('user_id', user_id)
      .eq('file_name', file_name)
      .limit(1);
    if (existing && existing.length > 0) {
      console.log('[UPLOAD][INFO] 이미 임베딩된 파일 이름:', file_name);
      return NextResponse.json({ alreadyExists: true, file_id: existing[0].file_id });
    }
    console.log('[UPLOAD][DEBUG] 파일명:', file.name, '타입:', file.type, '크기:', file.size);
    // 파일 파싱
    let text = '';
    if (file.type === 'text/plain') {
      text = await file.text();
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // docx 파싱
      const buffer = Buffer.from(await file.arrayBuffer());
      try {
        const docx = require('docx-parser');
        text = await new Promise((resolve, reject) => {
          docx.parseDocx(buffer, (data: string) => resolve(data));
        });
      } catch (err) {
        console.error('[UPLOAD][ERROR] docx 파싱 실패:', err);
        return NextResponse.json({ error: 'docx 파싱 실패: ' + String(err) }, { status: 500 });
      }
    } else {
      console.error('[UPLOAD][ERROR] 지원하지 않는 파일 타입:', file.type);
      return NextResponse.json({ error: '지원하지 않는 파일 타입: ' + file.type }, { status: 400 });
    }
    if (!text || text.length < 10) {
      console.error('[UPLOAD][ERROR] 텍스트 추출 실패 또는 너무 짧음:', text);
      return NextResponse.json({ error: '텍스트 추출 실패 또는 너무 짧음' }, { status: 400 });
    }
    console.log('[UPLOAD][DEBUG] 텍스트 길이:', text.length, '앞부분:', text.slice(0, 100));
    // 기존 chunking 대신 발화자 단위 청크 사용
    const chunks = chunkBySpeakerGroup(text, 800, 200);
    console.log('[UPLOAD][DEBUG] 청크 개수:', chunks.length);
    // 임베딩 생성 및 DB 저장
    for (const [i, chunk] of chunks.entries()) {
      console.log(`[UPLOAD][DEBUG] 청크 ${i+1}/${chunks.length} 임베딩 요청, 길이:`, chunk.length);
      // OpenAI 임베딩 API 호출
      let embedding;
      try {
        const res = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            input: chunk,
            model: 'text-embedding-3-small'
          })
        });
        const data = await res.json();
        if (!res.ok) {
          console.error('[UPLOAD][ERROR] 임베딩 API 실패:', data);
          throw new Error('임베딩 API 실패: ' + JSON.stringify(data));
        }
        embedding = data.data?.[0]?.embedding;
        if (!embedding) throw new Error('임베딩 결과 없음');
      } catch (err) {
        console.error('[UPLOAD][ERROR] 임베딩 생성 실패:', err);
        return NextResponse.json({ error: '임베딩 생성 실패: ' + String(err) }, { status: 500 });
      }
      // DB 저장
      try {
        const { error: dbError } = await supabase.from('fgi_doc_embeddings').insert({
          user_id,
          file_id,
          file_name,
          chunk_index: i,
          chunk_text: chunk,
          embedding,
        });
        if (dbError) {
          console.error('[UPLOAD][DB ERROR]', dbError);
          throw dbError;
        }
      } catch (err) {
        console.error('[UPLOAD][ERROR] DB 저장 실패:', err);
        return NextResponse.json({ error: 'DB 저장 실패: ' + String(err) }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[UPLOAD][ERROR] 전체 예외:', err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
} 