from fastapi import APIRouter, HTTPException, Form, UploadFile, File, Request, Query
from typing import Optional
import json

from ..application.use_cases import GetGroupAnalysisUseCase, CompareGroupAnalysisUseCase
from ..domain.entities import GroupAnalysisRequest, GroupComparisonRequest
from ..domain.services import GroupAnalysisService

router = APIRouter()

@router.get("/group-analysis/by-guide")
async def get_group_analysis_by_guide_get(
    guide_file_name: str = Query(...),
    user_id: str = Query(...)
):
    """가이드라인 파일명으로 그룹별 분석 결과를 조회합니다. (GET)"""
    try:
        use_case = GetGroupAnalysisUseCase()
        request = GroupAnalysisRequest(
            guide_file_name=guide_file_name,
            user_id=user_id
        )
        result = await use_case.execute(request)
        return result
    except Exception as e:
        print(f"Error in get_group_analysis_by_guide_get: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/group-analysis/by-guide")
async def get_group_analysis_by_guide_post(
    guide_file_name: str = Form(...),
    user_id: str = Form(...)
):
    """가이드라인 파일명으로 그룹별 분석 결과를 조회합니다. (POST)"""
    try:
        use_case = GetGroupAnalysisUseCase()
        request = GroupAnalysisRequest(
            guide_file_name=guide_file_name,
            user_id=user_id
        )
        result = await use_case.execute(request)
        return result
    except Exception as e:
        print(f"Error in get_group_analysis_by_guide_post: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/group-analysis/compare")
async def compare_group_analysis(request: Request):
    """선택된 그룹들의 분석 결과를 비교합니다."""
    try:
        # Form 데이터를 직접 파싱
        form_data = await request.form()
        
        guide_file_name = form_data.get("guide_file_name")
        user_id = form_data.get("user_id")
        group_names = form_data.get("group_names")
        job_id = form_data.get("job_id")
        
        print(f"Received compare request: guide_file_name={guide_file_name}, user_id={user_id}, group_names={group_names}")
        
        # 필수 필드 검증
        if not guide_file_name:
            raise HTTPException(status_code=422, detail="guide_file_name is required")
        if not user_id:
            raise HTTPException(status_code=422, detail="user_id is required")
        if not group_names:
            raise HTTPException(status_code=422, detail="group_names is required")
        
        use_case = CompareGroupAnalysisUseCase()
        
        try:
            group_names_list = json.loads(group_names)
        except json.JSONDecodeError as e:
            print(f"JSON decode error for group_names '{group_names}': {e}")
            raise HTTPException(status_code=422, detail=f"Invalid JSON format in group_names: {e}")
        
        print(f"Parsed group_names: {group_names_list}")
        
        request_obj = GroupComparisonRequest(
            guide_file_name=guide_file_name,
            user_id=user_id,
            group_names=group_names_list
        )
        result = await use_case.execute(request_obj, job_id)
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in compare_group_analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/group-comparisons")
async def get_user_group_comparisons(user_id: str = Query(...)):
    """사용자의 그룹 비교 분석 목록을 조회합니다."""
    try:
        service = GroupAnalysisService()
        comparisons = await service.repository.get_user_group_comparisons(user_id)
        return {"comparisons": [comp.dict() for comp in comparisons]}
    except Exception as e:
        print(f"Error in get_user_group_comparisons: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/group-comparisons/{comparison_id}")
async def get_group_comparison_detail(comparison_id: str):
    """특정 그룹 비교 분석 결과를 조회합니다."""
    try:
        service = GroupAnalysisService()
        result = await service.repository.get_group_comparison_with_topics(comparison_id)
        if not result:
            raise HTTPException(status_code=404, detail="Group comparison not found")
        return result.dict()
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_group_comparison_detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/group-comparisons/{comparison_id}")
async def delete_group_comparison(comparison_id: str, user_id: str = Query(...)):
    """그룹 비교 분석 결과를 삭제합니다."""
    try:
        service = GroupAnalysisService()
        success = await service.repository.delete_group_comparison(comparison_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Group comparison not found or access denied")
        return {"message": "Group comparison deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in delete_group_comparison: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/group-analysis/save-metadata")
async def save_group_comparison_metadata(
    comparison_id: str = Form(...),
    title: str = Form(...),
    description: str = Form(""),
    user_id: str = Form(...)
):
    """그룹 비교 분석의 제목과 설명을 저장합니다."""
    try:
        service = GroupAnalysisService()
        success = await service.repository.update_group_comparison_metadata(
            comparison_id, user_id, title, description
        )
        if not success:
            raise HTTPException(status_code=404, detail="Group comparison not found or access denied")
        return {"message": "Metadata saved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in save_group_comparison_metadata: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 