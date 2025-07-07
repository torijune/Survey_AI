import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const LLM_MODEL = 'gpt-4o-mini';

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

export async function POST(req: NextRequest) {
  try {
    const { user_id, file_id, question, chat_history, chat_group_id } = await req.json();
    if (!user_id || !file_id || !question) {
      return NextResponse.json({ error: 'user_id, file_id, question 필요' }, { status: 400 });
    }
    // chat_group_id가 없으면 새로 생성
    const groupId = chat_group_id || uuidv4();
    // 1. 질문 임베딩
    const questionEmbedding = await getEmbedding(question);

    // 2. DB에서 top 5 chunk 검색 (pgvector 최근접 검색)
    const { data: chunks, error } = await supabase.rpc('match_fgi_doc_embeddings', {
      query_embedding: questionEmbedding,
      match_count: 5,
      p_user_id: user_id,
      p_file_id: file_id
    });
    if (error) throw new Error(error.message);

    const topChunks = (chunks || []).map((c: any) => c.chunk_text);

    // 3. LLM 프롬프트
    const context = topChunks.join('\n---\n');
    const messages = [
      { role: 'system', content: 'FGI 회의록 기반 전문가. context에 없는 내용은 모른다고 답해.' },
      ...(chat_history || []),
      { role: 'user', content: `context:\n${context}\n\n질문: ${question}\n\n답변:` }
    ];

    const llmRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages,
        temperature: 0.2
      })
    });
    const llmData = await llmRes.json();
    const answer = llmData.choices?.[0]?.message?.content || '[답변 생성 실패]';

    // 질문 저장
    await supabase.from('fgi_rag_chats').insert({
      user_id,
      file_id,
      role: 'user',
      content: question,
      created_at: new Date().toISOString(),
      chat_group_id: groupId,
    });
    // 답변 저장
    await supabase.from('fgi_rag_chats').insert({
      user_id,
      file_id,
      role: 'assistant',
      content: answer,
      created_at: new Date().toISOString(),
      chat_group_id: groupId,
    });

    return NextResponse.json({ answer, topChunks, chat_group_id: groupId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'RAG 질의응답 오류' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');
    const file_id = searchParams.get('file_id');
    const chat_group_id = searchParams.get('chat_group_id');
    const favorites = searchParams.get('favorites');

    if (!user_id) {
      return NextResponse.json({ error: 'user_id 필요' }, { status: 400 });
    }

    if (favorites === '1') {
      // 저장된 Q&A 불러오기
      const { data, error } = await supabase
        .from('fgi_rag_favorites')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return NextResponse.json({ favorites: data });
    }

    // 대화 이력 불러오기
    let query = supabase
      .from('fgi_rag_chats')
      .select('role, content, created_at, chat_group_id')
      .eq('user_id', user_id);
    if (file_id) query = query.eq('file_id', file_id);
    if (chat_group_id) query = query.eq('chat_group_id', chat_group_id);
    query = query.order('created_at', { ascending: true });
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ chat: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'RAG 대화/QA 조회 오류' }, { status: 500 });
  }
} 