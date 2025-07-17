from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import StreamingResponse
import json
import io
from typing import Optional
from app.batch_analysis.domain.use_cases import BatchAnalysisUseCase
from app.batch_analysis.domain.services import BatchAnalysisService
from app.batch_analysis.domain.entities import BatchAnalysisRequest
from app.batch_analysis.infra.batch_analysis_repository import BatchAnalysisRepository
from app.batch_analysis.application.workflow import TableAnalysisWorkflow

router = APIRouter(prefix="", tags=["batch-analysis"])


def get_batch_analysis_use_case() -> BatchAnalysisUseCase:
    """배치 분석 유스케이스 의존성 주입"""
    repository = BatchAnalysisRepository()
    workflow = TableAnalysisWorkflow()
    service = BatchAnalysisService(repository, workflow)
    return BatchAnalysisUseCase(service)


@router.post("/start")
async def start_batch_analysis(
    file: UploadFile = File(...),
    raw_data_file: UploadFile = File(None),
    lang: str = Form("한국어"),
    user_id: str = Form(...),
    batch_test_types: str = Form(...),
    file_name: str = Form(None),
    use_statistical_test: str = Form("true")
):
    """배치 분석 시작 (자동 이어하기 지원)"""
    try:
        # 파일 읽기
        file_content = await file.read()
        # test_type_map 파싱
        test_type_map = json.loads(batch_test_types)
        use_statistical_test_bool = use_statistical_test.lower() == "true"
        # manual 모드 체크: use_statistical_test가 false이거나 모든 test_type이 manual이면 raw_data_file 선택적 처리
        all_manual = not use_statistical_test_bool or all(test_type == "manual" for test_type in test_type_map.values())
        if all_manual:
            raw_data_content = None
            raw_data_filename = None
            print(f"[batch_analysis] manual mode - raw_data_file 처리 생략")
        else:
            if not raw_data_file:
                raise HTTPException(status_code=400, detail="ft_test 또는 chi_square 통계 검정을 사용하려면 raw_data_file이 필요합니다.")
            raw_data_content = await raw_data_file.read()
            raw_data_filename = raw_data_file.filename
        # 요청 객체 생성
        final_file_name = file_name or file.filename or "unknown_file"
        # --- 자동 이어하기 로직 추가 ---
        repository = BatchAnalysisRepository()
        # running, pending 상태 중 가장 최근 job 조회
        existing_job = await repository.get_latest_job_by_user_and_file(user_id, final_file_name)
        if existing_job and existing_job.get("status") in ["pending", "running"]:
            # 기존 job_id로 이어서 반환
            return {"success": True, "job_id": existing_job["id"], "resumed": True}
        # --- 새로 시작 ---
        request = BatchAnalysisRequest(
            file_content=file_content,
            file_name=final_file_name,
            raw_data_content=raw_data_content,
            raw_data_filename=raw_data_filename,
            lang=lang,
            user_id=user_id,
            batch_test_types=test_type_map,
            use_statistical_test=use_statistical_test_bool
        )
        use_case = get_batch_analysis_use_case()
        result = await use_case.start_batch_analysis(request)
        return result.dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_batch_status(job_id: str = Query(...)):
    """배치 분석 상태 조회"""
    try:
        use_case = get_batch_analysis_use_case()
        result = await use_case.get_batch_status(job_id)
        return result.dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cancel")
async def cancel_batch_analysis(job_id: str):
    """배치 분석 취소"""
    try:
        use_case = get_batch_analysis_use_case()
        result = await use_case.cancel_batch_analysis(job_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/restart")
async def restart_batch_analysis(job_id: str):
    """배치 분석 재시작"""
    try:
        use_case = get_batch_analysis_use_case()
        result = await use_case.restart_batch_analysis(job_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/logs")
async def get_batch_logs(job_id: str = Query(...)):
    """배치 분석 로그 조회"""
    try:
        use_case = get_batch_analysis_use_case()
        result = await use_case.get_batch_logs(job_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download")
async def download_batch_results(job_id: str = Query(...)):
    """배치 분석 결과 다운로드"""
    try:
        use_case = get_batch_analysis_use_case()
        result = await use_case.download_batch_results(job_id)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "다운로드 실패"))
        
        # JSON 파일로 스트리밍 응답
        json_data = json.dumps(result["data"], ensure_ascii=False, indent=2)
        buf = io.BytesIO(json_data.encode("utf-8"))
        
        return StreamingResponse(
            buf, 
            media_type="application/json", 
            headers={"Content-Disposition": f"attachment; filename=batch_{job_id}_results.json"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 