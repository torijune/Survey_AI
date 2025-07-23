from abc import ABC, abstractmethod
from typing import Dict, List, Any
from app.fgi_group_analysis.domain.entities import GroupAnalysisRequest, GroupComparisonRequest, GroupComparisonResult, GroupAnalysisResult
from app.fgi_group_analysis.domain.services import GroupAnalysisService

class GetGroupAnalysisUseCase:
    """그룹별 분석 결과 조회 유스케이스"""
    
    def __init__(self):
        self.service = GroupAnalysisService()
    
    async def execute(self, request: GroupAnalysisRequest) -> Dict[str, Any]:
        """가이드라인 파일명으로 그룹별 분석 결과를 조회합니다."""
        groups = await self.service.get_group_analyses_by_guide(
            request.guide_file_name, 
            request.user_id
        )
        return {"groups": groups}

class CompareGroupAnalysisUseCase:
    """그룹 비교 분석 유스케이스"""
    
    def __init__(self):
        self.service = GroupAnalysisService()
    
    async def execute(self, request: GroupComparisonRequest, job_id: str = None) -> Dict[str, Any]:
        """선택된 그룹들의 분석 결과를 비교합니다."""
        result = await self.service.compare_groups(
            request.guide_file_name,
            request.user_id,
            request.group_names,
            job_id
        )
        return result 