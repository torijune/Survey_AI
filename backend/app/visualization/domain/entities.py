from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

class SurveyTable(BaseModel):
    """문 표 데이터 엔티티"""
    columns: List[str]
    data: List[List[Any]]
    question_text: str
    question_key: str

class VisualizationData(BaseModel):
    """시각화 데이터 엔티티"""
    user_id: Optional[str] = None
    question_key: str
    question_text: str
    file_name: Optional[str] = None
    chart_type: str
    chart_data: Dict[str, Any]
    created_at: Optional[datetime] = None

class VisualizationResponse(BaseModel):
    """시각화 응답 엔티티"""
    id: str
    message: str

class TableParseResponse(BaseModel):
    """테이블 파싱 응답 엔티티"""
    columns: List[str]
    data: List[List[Any]]
    question_text: str
    question_key: str