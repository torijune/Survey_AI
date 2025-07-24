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
    title: str
    description: Optional[str] = None
    question_key: str
    question_text: str
    file_name: Optional[str] = None
    chart_type: str
    selected_columns: List[str]
    chart_data: List[Dict[str, Any]]
    created_at: Optional[str] = None

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

class QuestionListResponse(BaseModel):
    """질문 목록 응답 엔티티"""
    questions: List[Dict[str, str]]  # [{"key": "B1", "text": "질문 내용"}]

class QuestionDataResponse(BaseModel):
    """특정 질문 데이터 응답 엔티티"""
    columns: List[str]
    data: List[List[Any]]
    question_text: str
    question_key: str