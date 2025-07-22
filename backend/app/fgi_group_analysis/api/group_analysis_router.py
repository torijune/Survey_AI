from fastapi import APIRouter, HTTPException, Query, Body
from typing import List, Optional
from ..domain.services import GroupAnalysisService
from ..application.use_cases import GetGroupAnalysesUseCase, CompareGroupsUseCase
from ..domain.entities import GroupComparisonRequest
from ..infra.supabase_client import get_supabase

router = APIRouter(prefix="/group-analysis", tags=["FGI Group Analysis"])

# 의존성 주입
def get_group_analysis_service():
    return GroupAnalysisService()

def get_group_analyses_use_case():
    service = get_group_analysis_service()
    return GetGroupAnalysesUseCase(service)

def get_compare_groups_use_case():
    service = get_group_analysis_service()
    return CompareGroupsUseCase(service)

@router.get("/by-guide")
async def get_group_analyses_by_guide(
    guide_file_name: str = Query(..., description="가이드라인 파일명"),
    user_id: Optional[str] = Query(None, description="유저 ID")
):
    """
    guide_file_name(가이드라인 파일명)으로 fgi_subject_analyses 테이블에서
    group_name별 주제별 분석 결과(topics, results, title, description 등) 조회
    """
    try:
        use_case = get_group_analyses_use_case()
        result = await use_case.execute(guide_file_name, user_id)
        
        # Pydantic 모델을 dict로 변환
        groups_dict = {}
        for group_name, analyses in result.items():
            groups_dict[group_name] = [analysis.dict() for analysis in analyses]
        
        return {"groups": groups_dict}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/compare")
async def compare_groups(request: GroupComparisonRequest):
    """
    선택된 그룹들을 비교 분석합니다.
    """
    try:
        use_case = get_compare_groups_use_case()
        result = await use_case.execute(request)
        return result.dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 