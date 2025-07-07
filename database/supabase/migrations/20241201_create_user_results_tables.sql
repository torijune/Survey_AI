-- 설문조사 계획 수립 결과 테이블
CREATE TABLE IF NOT EXISTS survey_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  objective TEXT,
  generated_objective TEXT,
  generated_audience TEXT,
  generated_structure TEXT,
  generated_questions TEXT,
  validation_checklist TEXT,
  full_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 설문 분석 결과 테이블
CREATE TABLE IF NOT EXISTS survey_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  uploaded_file_name TEXT,
  analysis_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 설문 시각화 결과 테이블
CREATE TABLE IF NOT EXISTS survey_visualizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  uploaded_file_name TEXT,
  selected_table_key TEXT,
  selected_chart_type TEXT,
  chart_data JSONB,
  chart_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책 설정
ALTER TABLE survey_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_visualizations ENABLE ROW LEVEL SECURITY;

-- survey_plans RLS 정책
CREATE POLICY "Users can view their own survey plans" ON survey_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own survey plans" ON survey_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own survey plans" ON survey_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own survey plans" ON survey_plans
  FOR DELETE USING (auth.uid() = user_id);

-- survey_analyses RLS 정책
CREATE POLICY "Users can view their own survey analyses" ON survey_analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own survey analyses" ON survey_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own survey analyses" ON survey_analyses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own survey analyses" ON survey_analyses
  FOR DELETE USING (auth.uid() = user_id);

-- survey_visualizations RLS 정책
CREATE POLICY "Users can view their own survey visualizations" ON survey_visualizations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own survey visualizations" ON survey_visualizations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own survey visualizations" ON survey_visualizations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own survey visualizations" ON survey_visualizations
  FOR DELETE USING (auth.uid() = user_id);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_survey_plans_user_id ON survey_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_plans_created_at ON survey_plans(created_at);
CREATE INDEX IF NOT EXISTS idx_survey_analyses_user_id ON survey_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_analyses_created_at ON survey_analyses(created_at);
CREATE INDEX IF NOT EXISTS idx_survey_visualizations_user_id ON survey_visualizations(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_visualizations_created_at ON survey_visualizations(created_at); 