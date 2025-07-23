from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class GroupAnalysisRequest(BaseModel):
    guide_file_name: str
    user_id: str

class GroupComparisonRequest(BaseModel):
    guide_file_name: str
    user_id: str
    group_names: List[str]

class GroupAnalysisResult(BaseModel):
    groups: Dict[str, List[Dict[str, Any]]]

class GroupComparisonResult(BaseModel):
    summary: str
    topic_comparisons: Dict[str, Dict[str, str]]
    recommendations: str

# DB 저장용 엔티티들
class GroupComparisonSaveRequest(BaseModel):
    user_id: str
    guide_file_name: str
    group_names: List[str]
    summary: str
    recommendations: str
    topic_comparisons: Dict[str, Dict[str, str]]

class GroupComparisonDB(BaseModel):
    id: str
    user_id: str
    guide_file_name: str
    group_names: List[str]
    title: Optional[str]
    description: Optional[str]
    summary: Optional[str]
    recommendations: Optional[str]
    total_topics: int
    analysis_status: str
    created_at: datetime
    updated_at: datetime

class GroupComparisonTopicDB(BaseModel):
    id: str
    comparison_id: str
    topic_name: str
    topic_order: int
    common_points: Optional[str]
    differences: Optional[str]
    insights: Optional[str]
    created_at: datetime

class GroupComparisonWithTopics(BaseModel):
    comparison: GroupComparisonDB
    topics: List[GroupComparisonTopicDB] 