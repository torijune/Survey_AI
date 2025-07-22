from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel

class GroupAnalysisResult(BaseModel):
    """그룹별 분석 결과 엔티티"""
    id: str
    group_name: str
    title: str
    description: Optional[str]
    topics: List[str]
    results: List[Dict[str, Any]]
    created_at: datetime
    user_id: str

class GroupComparisonRequest(BaseModel):
    """그룹 비교 분석 요청 엔티티"""
    guide_file_name: str
    selected_groups: List[str]
    user_id: str
    comparison_type: str = "content"  # content, sentiment, keyword 등

class GroupComparisonResult(BaseModel):
    """그룹 비교 분석 결과 엔티티"""
    guide_file_name: str
    selected_groups: List[str]
    comparison_type: str
    comparison_result: Dict[str, Any]
    created_at: datetime 