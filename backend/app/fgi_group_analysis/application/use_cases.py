from typing import List, Dict, Any, Optional
from ..domain.services import GroupAnalysisService
from ..domain.entities import GroupAnalysisResult, GroupComparisonRequest, GroupComparisonResult

class GetGroupAnalysesUseCase:
    """그룹별 분석 결과 조회 Use Case"""
    
    def __init__(self, group_analysis_service: GroupAnalysisService):
        self.service = group_analysis_service
    
    async def execute(self, guide_file_name: str, user_id: Optional[str] = None) -> Dict[str, List[GroupAnalysisResult]]:
        """가이드라인 파일명으로 그룹별 분석 결과를 조회합니다."""
        return await self.service.get_group_analyses_by_guide(guide_file_name, user_id)

class CompareGroupsUseCase:
    """그룹 비교 분석 Use Case"""
    
    def __init__(self, group_analysis_service: GroupAnalysisService):
        self.service = group_analysis_service
    
    async def execute(self, request: GroupComparisonRequest) -> GroupComparisonResult:
        """선택된 그룹들을 비교 분석합니다."""
        return await self.service.compare_groups(request) 