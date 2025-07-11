from typing import Dict, Any, Optional
from .entities import BatchAnalysisRequest, BatchAnalysisResponse, BatchAnalysisStatusResponse
from .services import BatchAnalysisService


class BatchAnalysisUseCase:
    """배치 분석 유스케이스"""
    
    def __init__(self, service: BatchAnalysisService):
        self.service = service
    
    async def start_batch_analysis(self, request: BatchAnalysisRequest) -> BatchAnalysisResponse:
        """배치 분석 시작 유스케이스"""
        request_data = {
            "file_content": request.file_content,
            "file_name": request.file_name,
            "raw_data_content": request.raw_data_content,
            "raw_data_filename": request.raw_data_filename,
            "lang": request.lang,
            "user_id": request.user_id,
            "batch_test_types": request.batch_test_types
        }
        
        result = await self.service.start_batch_analysis(request_data)
        
        return BatchAnalysisResponse(
            success=result["success"],
            job_id=result.get("job_id"),
            error=result.get("error")
        )
    
    async def get_batch_status(self, job_id: str) -> BatchAnalysisStatusResponse:
        """배치 분석 상태 조회 유스케이스"""
        result = await self.service.get_batch_status(job_id)
        
        return BatchAnalysisStatusResponse(
            success=result["success"],
            results=result.get("results", []),
            error=result.get("error")
        )
    
    async def cancel_batch_analysis(self, job_id: str) -> Dict[str, Any]:
        """배치 분석 취소 유스케이스"""
        return await self.service.cancel_batch_analysis(job_id)
    
    async def restart_batch_analysis(self, job_id: str) -> Dict[str, Any]:
        """배치 분석 재시작 유스케이스"""
        return await self.service.restart_batch_analysis(job_id)
    
    async def get_batch_logs(self, job_id: str) -> Dict[str, Any]:
        """배치 분석 로그 조회 유스케이스"""
        return await self.service.get_batch_logs(job_id)
    
    async def download_batch_results(self, job_id: str) -> Dict[str, Any]:
        """배치 분석 결과 다운로드 유스케이스"""
        return await self.service.download_batch_results(job_id) 