# backend/app/planner/api/ws_router.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.planner.application.workflow import PlannerWorkflow
import asyncio

ws_router = APIRouter()

@ws_router.websocket("/ws/planner/progress")
async def planner_progress_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        # 클라이언트로부터 초기 데이터 수신 (topic, objective, lang 등)
        init_data = await websocket.receive_json()
        topic = init_data.get("topic")
        objective = init_data.get("objective")
        lang = init_data.get("lang", "한국어")

        def make_on_step(ws):
            async def on_step(step):
                step_labels = {
                    "intro": "설문 목적 생성",
                    "audience": "타겟 응답자 생성",
                    "structure": "설문 구조 생성",
                    "question": "문항 생성",
                    "analysis": "분석 방법 제안",
                    "validationChecklist": "설문 검증 체크리스트"
                }
                steps = list(step_labels.keys())
                idx = steps.index(step) if step in steps else 0
                await ws.send_json({
                    "step": step,
                    "progress": (idx + 1) / len(steps),
                    "message": f"{step_labels.get(step, step)} 진행 중..."
                })
            return on_step

        workflow = PlannerWorkflow()
        # on_step 콜백을 비동기로 래핑
        async def async_on_step(step):
            await make_on_step(websocket)(step)

        # 워크플로우 실행 (각 단계별로 진행 상황 전송)
        result = await workflow.execute(topic, objective, lang, on_step=async_on_step)
        await websocket.send_json({"done": True, "message": "설문 설계 완료!", "result": result})
    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        await websocket.send_json({"error": str(e)})