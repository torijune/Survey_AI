from typing import Dict, Any, Optional
from ...domain.planner.entities import PlannerState
from ...domain.planner.use_cases import CreateSurveyPlanUseCase
from ...domain.planner.services import PlannerService
from ...infrastructure.openai.client import OpenAIClient


class PlannerWorkflow:
    """설문 계획 워크플로우 (기존 호환성 유지)"""
    
    def __init__(self):
        self.openai_client = OpenAIClient()
        self.planner_service = PlannerService(self.openai_client)
        self.use_case = CreateSurveyPlanUseCase(self.planner_service)
    
    async def execute(self, topic: str, objective: str, lang: str = "한국어", on_step=None) -> Dict[str, Any]:
        """설문 계획 워크플로우 실행 (기존 메서드와 동일한 인터페이스)"""
        return await self.use_case.execute(topic, objective, lang, on_step) 