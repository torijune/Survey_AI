from typing import Dict, Any, Optional
from app.visualization.infra.supabase_client import get_supabase
import uuid
from datetime import datetime

class VisualizationRepository:
    def __init__(self):
        self.supabase = get_supabase()

    async def save_visualization(self, data: Dict[str, Any]) -> str:
        visualization_id = str(uuid.uuid4())
        record = {
            "id": visualization_id,
            "user_id": data.get("user_id"),
            "question_key": data.get("question_key"),
            "question_text": data.get("question_text"),
            "file_name": data.get("file_name"),
            "chart_type": data.get("chart_type"),
            "image_base64": data.get("image_base64"),
            "chart_data": data.get("chart_data"),
            "created_at": datetime.utcnow().isoformat()
        }
        result = self.supabase.table("survey_visualizations").insert(record).execute()
        if hasattr(result, 'error') and result.error:
            raise Exception(f"DB 저장 실패: {result.error}")
        return visualization_id

    async def get_visualization_by_id(self, visualization_id: str) -> Optional[Dict[str, Any]]:
        result = self.supabase.table("survey_visualizations").select("*").eq("id", visualization_id).execute()
        if hasattr(result, 'error') and result.error:
            raise Exception(f"DB 조회 실패: {result.error}")
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None 