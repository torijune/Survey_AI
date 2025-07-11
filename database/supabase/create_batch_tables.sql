-- 배치 분석 작업 테이블
CREATE TABLE IF NOT EXISTS batch_analysis_jobs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 배치 분석 결과 테이블
CREATE TABLE IF NOT EXISTS batch_analysis_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES batch_analysis_jobs(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 배치 분석 로그 테이블
CREATE TABLE IF NOT EXISTS batch_analysis_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES batch_analysis_jobs(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책 설정
ALTER TABLE batch_analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_analysis_logs ENABLE ROW LEVEL SECURITY;

-- batch_analysis_jobs RLS 정책
CREATE POLICY "Users can view their own batch analysis jobs" ON batch_analysis_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own batch analysis jobs" ON batch_analysis_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own batch analysis jobs" ON batch_analysis_jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own batch analysis jobs" ON batch_analysis_jobs
  FOR DELETE USING (auth.uid() = user_id);

-- batch_analysis_results RLS 정책
CREATE POLICY "Users can view their own batch analysis results" ON batch_analysis_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM batch_analysis_jobs 
      WHERE batch_analysis_jobs.id = batch_analysis_results.job_id 
      AND batch_analysis_jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own batch analysis results" ON batch_analysis_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM batch_analysis_jobs 
      WHERE batch_analysis_jobs.id = batch_analysis_results.job_id 
      AND batch_analysis_jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own batch analysis results" ON batch_analysis_results
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM batch_analysis_jobs 
      WHERE batch_analysis_jobs.id = batch_analysis_results.job_id 
      AND batch_analysis_jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own batch analysis results" ON batch_analysis_results
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM batch_analysis_jobs 
      WHERE batch_analysis_jobs.id = batch_analysis_results.job_id 
      AND batch_analysis_jobs.user_id = auth.uid()
    )
  );

-- batch_analysis_logs RLS 정책
CREATE POLICY "Users can view their own batch analysis logs" ON batch_analysis_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM batch_analysis_jobs 
      WHERE batch_analysis_jobs.id = batch_analysis_logs.job_id 
      AND batch_analysis_jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own batch analysis logs" ON batch_analysis_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM batch_analysis_jobs 
      WHERE batch_analysis_jobs.id = batch_analysis_logs.job_id 
      AND batch_analysis_jobs.user_id = auth.uid()
    )
  );

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_batch_analysis_jobs_user_id ON batch_analysis_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_analysis_jobs_status ON batch_analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_batch_analysis_jobs_created_at ON batch_analysis_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_batch_analysis_results_job_id ON batch_analysis_results(job_id);
CREATE INDEX IF NOT EXISTS idx_batch_analysis_results_status ON batch_analysis_results(status);
CREATE INDEX IF NOT EXISTS idx_batch_analysis_logs_job_id ON batch_analysis_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_batch_analysis_logs_timestamp ON batch_analysis_logs(timestamp); 