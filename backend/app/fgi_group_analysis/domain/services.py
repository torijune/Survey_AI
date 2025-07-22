from typing import List, Dict, Any, Optional
from .entities import GroupAnalysisResult, GroupComparisonRequest, GroupComparisonResult
from ..infra.supabase_client import get_supabase
from datetime import datetime

class GroupAnalysisService:
    """그룹별 분석 서비스"""
    
    def __init__(self):
        self.supabase = get_supabase()
    
    async def get_group_analyses_by_guide(self, guide_file_name: str, user_id: Optional[str] = None) -> Dict[str, List[GroupAnalysisResult]]:
        """가이드라인 파일명으로 그룹별 분석 결과를 조회합니다."""
        query = self.supabase.table('fgi_subject_analyses').select('*').eq('guide_file_name', guide_file_name)
        if user_id:
            query = query.eq('user_id', user_id)
        
        res = query.order('created_at', desc=True).execute()
        
        if not hasattr(res, 'data') or not res.data:
            return {}
        
        # group_name별로 묶어서 반환
        group_map = {}
        for row in res.data:
            group = row.get('group_name') or '기타'
            if group not in group_map:
                group_map[group] = []
            
            group_map[group].append(GroupAnalysisResult(
                id=row.get('id'),
                group_name=group,
                title=row.get('title', ''),
                description=row.get('description'),
                topics=row.get('topics', []),
                results=row.get('results', []),
                created_at=row.get('created_at'),
                user_id=row.get('user_id')
            ))
        
        return group_map
    
    async def compare_groups(self, request: GroupComparisonRequest) -> GroupComparisonResult:
        """선택된 그룹들을 비교 분석합니다."""
        # 1. 선택된 그룹들의 분석 결과 조회
        group_analyses = await self.get_group_analyses_by_guide(request.guide_file_name, request.user_id)
        
        # 2. 선택된 그룹들만 필터링
        selected_analyses = {}
        for group_name in request.selected_groups:
            if group_name in group_analyses:
                selected_analyses[group_name] = group_analyses[group_name]
        
        # 3. 비교 분석 로직 (추후 확장 가능)
        comparison_result = await self._perform_comparison(selected_analyses, request.comparison_type)
        
        return GroupComparisonResult(
            guide_file_name=request.guide_file_name,
            selected_groups=request.selected_groups,
            comparison_type=request.comparison_type,
            comparison_result=comparison_result,
            created_at=datetime.now()
        )
    
    async def _perform_comparison(self, group_analyses: Dict[str, List[GroupAnalysisResult]], comparison_type: str) -> Dict[str, Any]:
        """실제 비교 분석을 수행합니다."""
        # 기본 비교 분석 (추후 AI 기반 분석으로 확장 가능)
        comparison_result = {
            "total_groups": len(group_analyses),
            "group_summaries": {},
            "common_topics": [],
            "unique_topics": {},
            "analysis_summary": ""
        }
        
        # 각 그룹별 요약
        all_topics = set()
        for group_name, analyses in group_analyses.items():
            if analyses:
                latest_analysis = analyses[0]  # 가장 최근 분석
                comparison_result["group_summaries"][group_name] = {
                    "title": latest_analysis.title,
                    "description": latest_analysis.description,
                    "topics_count": len(latest_analysis.topics),
                    "created_at": latest_analysis.created_at
                }
                all_topics.update(latest_analysis.topics)
        
        # 공통 주제와 고유 주제 분석
        group_topics = {}
        for group_name, analyses in group_analyses.items():
            if analyses:
                group_topics[group_name] = set(analyses[0].topics)
        
        # 공통 주제 찾기
        if group_topics:
            common_topics = set.intersection(*group_topics.values())
            comparison_result["common_topics"] = list(common_topics)
            
            # 고유 주제 찾기
            for group_name, topics in group_topics.items():
                unique_topics = topics - common_topics
                if unique_topics:
                    comparison_result["unique_topics"][group_name] = list(unique_topics)
        
        return comparison_result 