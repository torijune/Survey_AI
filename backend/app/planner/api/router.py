from fastapi import APIRouter, Form, HTTPException, Request
from app.planner.domain.use_cases import CreateSurveyPlanUseCase
from app.planner.domain.services import PlannerService
from app.planner.infra.openai_client import OpenAIClient
from app.planner.infra.planner_repository import PlannerRepository

router = APIRouter(prefix="", tags=["Planner"])

def get_planner_use_case():
    openai_client = OpenAIClient()
    service = PlannerService(openai_client=openai_client)
    return CreateSurveyPlanUseCase(service)

@router.post("/create")
async def create_plan(
    topic: str = Form(...),
    objective: str = Form(...),
    lang: str = Form("한국어"),
    user_id: str = Form(None)
):
    """
    설문 플래너 생성 API
    """
    try:
        use_case = get_planner_use_case()
        result = await use_case.execute(topic, objective, lang)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save")
async def save_plan(request: Request):
    """
    설문 플래너 결과를 DB에 저장하는 API
    """
    try:
        data = await request.json()
        repository = PlannerRepository()
        plan_id = await repository.save_plan(data)
        return {"id": plan_id, "message": "플래너가 성공적으로 저장되었습니다."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 