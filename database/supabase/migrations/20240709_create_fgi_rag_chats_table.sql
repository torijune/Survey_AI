-- FGI RAG 질의응답 대화 이력 테이블
CREATE TABLE IF NOT EXISTS fgi_rag_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id TEXT NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  chat_group_id UUID
);

-- RLS 정책 설정
ALTER TABLE fgi_rag_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rag chats" ON fgi_rag_chats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rag chats" ON fgi_rag_chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_fgi_rag_chats_user_id ON fgi_rag_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_fgi_rag_chats_file_id ON fgi_rag_chats(file_id);
CREATE INDEX IF NOT EXISTS idx_fgi_rag_chats_created_at ON fgi_rag_chats(created_at); 