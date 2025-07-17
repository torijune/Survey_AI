from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict

ws_router = APIRouter()

# job_id별 연결된 WebSocket 세션 관리
table_active_connections: Dict[str, WebSocket] = {}

@ws_router.websocket("/ws/table-analysis-progress/{job_id}")
async def websocket_table_analysis_progress(websocket: WebSocket, job_id: str):
    await websocket.accept()
    table_active_connections[job_id] = websocket
    try:
        while True:
            # 클라이언트로부터 ping/pong 등 메시지 수신 대기 (keepalive)
            await websocket.receive_text()
    except WebSocketDisconnect:
        if job_id in table_active_connections:
            del table_active_connections[job_id]

# 진행상황을 해당 job_id의 WebSocket으로 push하는 함수
async def ws_send_table_progress(job_id: str, data: dict):
    ws = table_active_connections.get(job_id)
    if ws:
        print(f'[WebSocket][table-analysis] 메시지 전송: {data} (job_id: {job_id})')
        await ws.send_json(data)
    else:
        print(f'[WebSocket][table-analysis] 연결된 WebSocket 없음 (job_id: {job_id})') 