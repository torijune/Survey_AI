from typing import Dict, Any, Optional
from .entities import PlannerState, PlannerResult
from .services import PlannerService


class CreateSurveyPlanUseCase:
    """설문 계획 생성 유스케이스"""
    
    def __init__(self, planner_service: PlannerService):
        self.planner_service = planner_service
    
    async def execute(self, topic: str, objective: str, lang: str = "한국어", on_step=None) -> Dict[str, Any]:
        """설문 계획 워크플로우 실행"""
        try:
            # 초기 상태 설정
            state = PlannerState(
                topic=topic,
                objective=objective,
                lang=lang
            )
            
            # 워크플로우 실행
            state = await self.planner_service.analyze_intro(state, on_step)
            state = await self.planner_service.analyze_audience(state, on_step)
            state = await self.planner_service.plan_structure(state, on_step)
            state = await self.planner_service.generate_questions(state, on_step)
            state = await self.planner_service.plan_analysis(state, on_step)
            state = await self.planner_service.create_validation_checklist(state, on_step)
            
            return {
                "success": True,
                "result": {
                    "generated_objective": state.generated_objective,
                    "audience": state.audience,
                    "structure": state.structure,
                    "questions": state.questions,
                    "analysis": state.analysis,
                    "validation_checklist": state.validation_checklist
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            } 