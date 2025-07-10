from typing import Optional, Dict, Any
from pydantic import BaseModel


class PlannerState:
    """설문 계획 상태를 관리하는 클래스"""
    def __init__(self, **kwargs):
        self.topic = kwargs.get("topic", "")
        self.lang = kwargs.get("lang", "한국어")
        self.objective = kwargs.get("objective", "")
        self.generated_objective = kwargs.get("generated_objective", "")
        self.audience = kwargs.get("audience", "")
        self.structure = kwargs.get("structure", "")
        self.questions = kwargs.get("questions", "")
        self.analysis = kwargs.get("analysis", "")
        self.validation_checklist = kwargs.get("validation_checklist", "")


class PlannerRequest(BaseModel):
    """설문 계획 요청 모델"""
    topic: str
    objective: str
    lang: str = "한국어"


class PlannerResponse(BaseModel):
    """설문 계획 응답 모델"""
    success: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class PlannerResult(BaseModel):
    """설문 계획 결과 모델"""
    generated_objective: str
    audience: str
    structure: str
    questions: str
    analysis: str
    validation_checklist: Optional[str] = None 