from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel

class GroupAnalysisRequest(BaseModel):
    guide_file_name: str
    user_id: str

class GroupComparisonRequest(BaseModel):
    guide_file_name: str
    user_id: str
    group_names: List[str]

class TopicComparison(BaseModel):
    common_points: Optional[str] = None
    differences: Optional[str] = None
    insights: Optional[str] = None

class GroupComparisonResult(BaseModel):
    summary: Optional[str] = None
    topic_comparisons: Dict[str, TopicComparison] = {}
    recommendations: Optional[str] = None

class GroupAnalysisResult(BaseModel):
    groups: Dict[str, List[Dict[str, Any]]] = {} 