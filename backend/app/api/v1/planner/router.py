from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from ....domain.planner.entities import PlannerRequest, PlannerResponse
from ....domain.planner.use_cases import CreateSurveyPlanUseCase
from ....domain.planner.services import PlannerService
from ....infrastructure.openai.client import OpenAIClient

router = APIRouter(prefix="/planner", tags=["planner"])


@router.post("/create-plan", response_model=PlannerResponse)
async def create_survey_plan(request: PlannerRequest) -> PlannerResponse:
    """설문 계획 생성 API"""
    try:
        # 의존성 주입
        openai_client = OpenAIClient()
        planner_service = PlannerService(openai_client)
        use_case = CreateSurveyPlanUseCase(planner_service)
        
        # 유스케이스 실행
        result = await use_case.execute(
            topic=request.topic,
            objective=request.objective,
            lang=request.lang
        )
        
        return PlannerResponse(
            success=result["success"],
            result=result.get("result"),
            error=result.get("error")
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create-plan-with-progress")
async def create_survey_plan_with_progress(request: PlannerRequest):
    """진행 상황을 포함한 설문 계획 생성 API (실시간 진행 상황 포함)"""
    try:
        # 의존성 주입
        openai_client = OpenAIClient()
        planner_service = PlannerService(openai_client)
        use_case = CreateSurveyPlanUseCase(planner_service)
        
        # 진행 상황 콜백 함수
        def on_step(step_name: str):
            print(f"진행 중: {step_name}")
            # 여기서 WebSocket이나 Server-Sent Events로 진행 상황을 클라이언트에 전송할 수 있습니다.
        
        # 유스케이스 실행
        result = await use_case.execute(
            topic=request.topic,
            objective=request.objective,
            lang=request.lang,
            on_step=on_step
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 