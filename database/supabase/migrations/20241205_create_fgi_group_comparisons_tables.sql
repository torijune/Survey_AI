-- FGI 그룹 비교 분석 결과 저장 테이블들

-- 메인 비교 분석 테이블
CREATE TABLE IF NOT EXISTS fgi_group_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    guide_file_name TEXT NOT NULL,
    group_names TEXT[] NOT NULL, -- 비교한 그룹명들
    title TEXT, -- 분석 제목
    description TEXT, -- 분석 설명
    summary TEXT, -- 전체 비교 요약
    recommendations TEXT, -- 종합 권장사항
    total_topics INTEGER, -- 분석된 총 주제 수
    analysis_status TEXT DEFAULT 'completed', -- completed, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 주제별 분석 결과 테이블
CREATE TABLE IF NOT EXISTS fgi_group_comparison_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comparison_id UUID REFERENCES fgi_group_comparisons(id) ON DELETE CASCADE,
    topic_name TEXT NOT NULL, -- 주제명
    topic_order INTEGER, -- 주제 순서
    common_points TEXT, -- 공통점
    differences TEXT, -- 차이점
    insights TEXT, -- 주요 인사이트
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_fgi_group_comparisons_user_id ON fgi_group_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_fgi_group_comparisons_guide_file ON fgi_group_comparisons(guide_file_name);
CREATE INDEX IF NOT EXISTS idx_fgi_group_comparisons_created_at ON fgi_group_comparisons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fgi_group_comparison_topics_comparison_id ON fgi_group_comparison_topics(comparison_id);
CREATE INDEX IF NOT EXISTS idx_fgi_group_comparison_topics_topic_order ON fgi_group_comparison_topics(topic_order);

-- RLS (Row Level Security) 설정
ALTER TABLE fgi_group_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE fgi_group_comparison_topics ENABLE ROW LEVEL SECURITY;

-- 사용자별 데이터 접근 정책
CREATE POLICY "Users can view their own group comparisons" ON fgi_group_comparisons
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own group comparisons" ON fgi_group_comparisons
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own group comparisons" ON fgi_group_comparisons
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own group comparisons" ON fgi_group_comparisons
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- 주제별 분석 결과에 대한 정책 (comparison_id를 통해 간접적으로 접근)
CREATE POLICY "Users can view topics of their own comparisons" ON fgi_group_comparison_topics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM fgi_group_comparisons 
            WHERE fgi_group_comparisons.id = fgi_group_comparison_topics.comparison_id 
            AND fgi_group_comparisons.user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can insert topics for their own comparisons" ON fgi_group_comparison_topics
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM fgi_group_comparisons 
            WHERE fgi_group_comparisons.id = fgi_group_comparison_topics.comparison_id 
            AND fgi_group_comparisons.user_id::text = auth.uid()::text
        )
    ); 