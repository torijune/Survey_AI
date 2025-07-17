from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict

ws_router = APIRouter()

# job_id별 연결된 WebSocket 세션 관리
active_connections: Dict[str, WebSocket] = {}

@ws_router.websocket("/ws/fgi-progress/{job_id}")
async def websocket_fgi_progress(websocket: WebSocket, job_id: str):
    await websocket.accept()
    active_connections[job_id] = websocket
    try:
        while True:
            # 클라이언트로부터 ping/pong 등 메시지 수신 대기 (keepalive)
            await websocket.receive_text()
    except WebSocketDisconnect:
        if job_id in active_connections:
            del active_connections[job_id]

# 진행상황을 해당 job_id의 WebSocket으로 push하는 함수
async def ws_send_progress(job_id: str, data: dict):
    ws = active_connections.get(job_id)
    if ws:
        print(f'[WebSocket] 메시지 전송: {data} (job_id: {job_id})')  # 디버깅 로그 추가
        await ws.send_json(data)
    else:
        print(f'[WebSocket] 연결된 WebSocket 없음 (job_id: {job_id})')  # 디버깅 로그 추가 