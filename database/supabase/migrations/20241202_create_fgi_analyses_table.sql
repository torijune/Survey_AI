-- FGI 분석 결과 테이블
CREATE TABLE IF NOT EXISTS fgi_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  audio_files_count INTEGER DEFAULT 0,
  doc_files_count INTEGER DEFAULT 0,
  guide_file_name TEXT,
  summary_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책 설정
ALTER TABLE fgi_analyses ENABLE ROW LEVEL SECURITY;

-- fgi_analyses RLS 정책
CREATE POLICY "Users can view their own fgi analyses" ON fgi_analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fgi analyses" ON fgi_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fgi analyses" ON fgi_analyses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fgi analyses" ON fgi_analyses
  FOR DELETE USING (auth.uid() = user_id); 