from typing import List, Optional, Dict, Any
from datetime import datetime
from ...domain.batch_analysis.entities import BatchAnalysisJob, BatchAnalysisResult, BatchAnalysisLog
from utils.supabase_client import get_supabase


class BatchAnalysisRepository:
    """배치 분석 데이터베이스 리포지토리"""
    
    def __init__(self):
        self.supabase = get_supabase()
    
    async def create_job(self, job: BatchAnalysisJob) -> None:
        """배치 분석 작업 생성"""
        self.supabase.table("batch_analysis_jobs").insert({
            "id": job.id,
            "user_id": job.user_id,
            "file_name": job.file_name,
            "status": job.status
        }).execute()
    
    async def update_job_status(self, job_id: str, status: str) -> None:
        """배치 분석 작업 상태 업데이트"""
        self.supabase.table("batch_analysis_jobs").update({
            "status": status,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", job_id).execute()
    
    async def create_result(self, result: BatchAnalysisResult) -> None:
        """배치 분석 결과 생성"""
        self.supabase.table("batch_analysis_results").insert({
            "job_id": result.job_id,
            "question_key": result.question_key,
            "status": result.status,
            "result": result.result,
            "error": result.error
        }).execute()
    
    async def get_result(self, job_id: str, question_key: str) -> Optional[BatchAnalysisResult]:
        """특정 질문의 결과 조회"""
        res = self.supabase.table("batch_analysis_results").select("*").eq("job_id", job_id).eq("question_key", question_key).execute()
        
        if res.data and len(res.data) > 0:
            data = res.data[0]
            return BatchAnalysisResult(
                job_id=data["job_id"],
                question_key=data["question_key"],
                status=data["status"],
                result=data.get("result"),
                error=data.get("error"),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
        return None
    
    async def update_result_status(self, job_id: str, question_key: str, status: str) -> None:
        """결과 상태 업데이트"""
        self.supabase.table("batch_analysis_results").update({
            "status": status,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("job_id", job_id).eq("question_key", question_key).execute()
    
    async def update_result(self, job_id: str, question_key: str, status: str, result: Any, error: Optional[str]) -> None:
        """결과 업데이트"""
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        if result is not None:
            update_data["result"] = result
        if error is not None:
            update_data["error"] = error
        
        self.supabase.table("batch_analysis_results").update(update_data).eq("job_id", job_id).eq("question_key", question_key).execute()
    
    async def get_results_by_job_id(self, job_id: str) -> List[Dict[str, Any]]:
        """작업 ID로 모든 결과 조회"""
        res = self.supabase.table("batch_analysis_results").select("question_key,status,result,error,updated_at").eq("job_id", job_id).execute()
        return res.data if res.data else []
    
    async def update_pending_results_status(self, job_id: str, status: str) -> None:
        """대기 중인 결과들의 상태 업데이트"""
        self.supabase.table("batch_analysis_results").update({
            "status": status,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("job_id", job_id).in_("status", ["pending", "running"]).execute()
    
    async def get_pending_results(self, job_id: str) -> List[Dict[str, Any]]:
        """미완료 결과들 조회"""
        res = self.supabase.table("batch_analysis_results").select("question_key,status").eq("job_id", job_id).in_("status", ["pending", "running", "error", "cancelled"]).execute()
        return res.data if res.data else []
    
    async def create_log(self, log: BatchAnalysisLog) -> None:
        """로그 생성"""
        self.supabase.table("batch_analysis_logs").insert({
            "job_id": log.job_id,
            "event": log.event,
            "timestamp": log.timestamp.isoformat()
        }).execute()
    
    async def get_logs_by_job_id(self, job_id: str) -> List[Dict[str, Any]]:
        """작업 ID로 로그 조회"""
        res = self.supabase.table("batch_analysis_logs").select("event,timestamp").eq("job_id", job_id).order("timestamp").execute()
        return res.data if res.data else [] 

    async def get_latest_job_by_user_and_file(self, user_id: str, file_name: str, status: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """user_id, file_name, (선택적으로 status)로 가장 최근의 배치 분석 작업 조회"""
        query = self.supabase.table("batch_analysis_jobs").select("*").eq("user_id", user_id).eq("file_name", file_name)
        if status:
            query = query.eq("status", status)
        query = query.order("created_at", desc=True).limit(1)
        res = query.execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
        return None 