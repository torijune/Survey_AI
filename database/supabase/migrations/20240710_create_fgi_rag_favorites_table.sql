-- FGI RAG 질의응답 즐겨찾기/저장 테이블
CREATE TABLE IF NOT EXISTS fgi_rag_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id TEXT NOT NULL,
  file_name TEXT,
  chat_group_id UUID,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE fgi_rag_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rag favorites" ON fgi_rag_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rag favorites" ON fgi_rag_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_fgi_rag_favorites_user_id ON fgi_rag_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_fgi_rag_favorites_file_id ON fgi_rag_favorites(file_id);
CREATE INDEX IF NOT EXISTS idx_fgi_rag_favorites_chat_group_id ON fgi_rag_favorites(chat_group_id); 