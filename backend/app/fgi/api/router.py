from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from typing import Dict, Any, Optional
import uuid
from app.fgi.domain.use_cases import FGIAnalysisUseCase
from app.fgi.domain.services import FGIAnalysisService
from app.fgi.infra.openai_client import OpenAIClient
from app.fgi.infra.supabase_client import get_supabase

router = APIRouter(prefix="", tags=["fgi"])


def get_fgi_use_case() -> FGIAnalysisUseCase:
    """FGI 유스케이스 의존성 주입"""
    openai_client = OpenAIClient()
    fgi_service = FGIAnalysisService(openai_client)
    return FGIAnalysisUseCase(fgi_service)


# 진행상황 조회 API
@router.get("/progress")
async def get_fgi_progress(job_id: str = Query(...)):
    supabase = get_supabase()
    res = supabase.table("fgi_progress").select("*", count="exact").eq("job_id", job_id).execute()
    if not res.data or len(res.data) == 0:
        return {"success": False, "error": "No progress found for this job_id"}
    row = res.data[0]
    return {
        "success": True,
        "progress": row.get("progress"),
        "current": row.get("current"),
        "total": row.get("total"),
        "final_summary": row.get("final_summary"),
        "updated_at": row.get("updated_at")
    }

# 분석 시작/청크/완료 시 아래 함수 예시처럼 호출
# await update_fgi_progress(job_id, progress, current, total, final_summary)
# 예: await update_fgi_progress(job_id, f"청크 {i+1}/{total} 분석 중...", i+1, total)
# 예: await update_fgi_progress(job_id, "완료!", total, total, final_summary)


@router.post("/analyze")
async def analyze_fgi(
    file: UploadFile = File(...),
    on_step: Optional[str] = Form(None),
    job_id: Optional[str] = Form(None)
) -> Dict[str, Any]:
    """FGI 분석 실행"""
    try:
        # 파일 내용 읽기
        file_content = await file.read()
        file_name = file.filename
        
        if not file_name:
            raise HTTPException(status_code=400, detail="파일명이 필요합니다.")
        
        # 지원하는 파일 형식 확인
        if not file_name.lower().endswith(('.docx', '.txt')):
            raise HTTPException(
                status_code=400, 
                detail="지원하지 않는 파일 형식입니다. DOCX 또는 TXT 파일을 사용해주세요."
            )
        
        # FGI 분석 실행
        fgi_use_case = get_fgi_use_case()
        
        options = {}
        if on_step:
            options["on_step"] = on_step
        if job_id:
            options["job_id"] = job_id
        
        result = await fgi_use_case.execute_fgi_analysis(file_content, file_name, options)
        
        if not result.success:
            raise HTTPException(status_code=500, detail=result.error or "FGI 분석 실패")
        
        return {
            "success": True,
            "analysis_id": str(uuid.uuid4()),
            "chunk_summaries": result.chunk_summaries,
            "chunk_details": result.chunk_details if hasattr(result, 'chunk_details') else [],
            "final_summary": result.final_summary,
            "file_name": file_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FGI 분석 중 오류 발생: {str(e)}")


@router.post("/extract-guide-subjects")
async def extract_guide_subjects(
    file: UploadFile = File(...)
) -> Dict[str, Any]:
    """가이드 주제 추출"""
    try:
        # 파일 내용 읽기
        file_content = await file.read()
        file_name = file.filename
        
        if not file_name:
            raise HTTPException(status_code=400, detail="파일명이 필요합니다.")
        
        # 지원하는 파일 형식 확인
        if not file_name.lower().endswith('.docx'):
            raise HTTPException(
                status_code=400, 
                detail="가이드 주제 추출은 DOCX 파일만 지원합니다."
            )
        
        # 가이드 주제 추출
        fgi_use_case = get_fgi_use_case()
        subjects = await fgi_use_case.extract_guide_subjects(file_content)
        
        return {
            "success": True,
            "subjects": subjects,
            "file_name": file_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"가이드 주제 추출 중 오류 발생: {str(e)}") 