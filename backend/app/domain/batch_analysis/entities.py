from typing import Optional, Dict, Any, List, Union
from pydantic import BaseModel
from datetime import datetime
import uuid


class BatchAnalysisJob:
    """배치 분석 작업 엔티티"""
    def __init__(self, **kwargs):
        self.id = kwargs.get("id", str(uuid.uuid4()))
        self.user_id = kwargs.get("user_id", "")
        self.file_name = kwargs.get("file_name", "")
        self.status = kwargs.get("status", "pending")  # pending, running, done, cancelled, error
        self.created_at = kwargs.get("created_at", datetime.utcnow())
        self.updated_at = kwargs.get("updated_at", datetime.utcnow())


class BatchAnalysisResult:
    """배치 분석 결과 엔티티"""
    def __init__(self, **kwargs):
        self.job_id = kwargs.get("job_id", "")
        self.question_key = kwargs.get("question_key", "")
        self.status = kwargs.get("status", "pending")  # pending, running, done, error, cancelled
        self.result = kwargs.get("result", None)
        self.error = kwargs.get("error", None)
        self.created_at = kwargs.get("created_at", datetime.utcnow())
        self.updated_at = kwargs.get("updated_at", datetime.utcnow())


class BatchAnalysisLog:
    """배치 분석 로그 엔티티"""
    def __init__(self, **kwargs):
        self.job_id = kwargs.get("job_id", "")
        self.event = kwargs.get("event", "")  # start, progress, complete, error, cancel, restart
        self.timestamp = kwargs.get("timestamp", datetime.utcnow())
        self.details = kwargs.get("details", {})


class BatchAnalysisRequest(BaseModel):
    """배치 분석 요청 모델"""
    file_content: bytes
    file_name: str
    raw_data_content: Optional[bytes] = None
    raw_data_filename: Optional[str] = None
    lang: str = "한국어"
    user_id: str
    batch_test_types: Dict[str, str]  # question_key -> test_type 매핑
    use_statistical_test: bool = True


class BatchAnalysisResponse(BaseModel):
    """배치 분석 응답 모델"""
    success: bool
    job_id: Optional[str] = None
    error: Optional[str] = None


class BatchAnalysisStatusResponse(BaseModel):
    """배치 분석 상태 응답 모델"""
    success: bool
    results: List[Dict[str, Any]] = []
    error: Optional[str] = None


class BatchAnalysisDownloadResponse(BaseModel):
    """배치 분석 다운로드 응답 모델"""
    success: bool
    data: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None 