from typing import Dict, Any
from app.planner.infra.supabase_client import get_supabase
import uuid
from datetime import datetime

class PlannerRepository:
    def __init__(self):
        self.supabase = get_supabase()

    async def save_plan(self, data: Dict[str, Any]) -> str:
        plan_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        record = {
            "id": plan_id,
            "user_id": data.get("user_id"),
            "topic": data.get("topic"),
            "objective": data.get("objective"),
            "generated_objective": data.get("generated_objective"),
            "generated_audience": data.get("generated_audience"),
            "generated_structure": data.get("generated_structure"),
            "generated_questions": data.get("generated_questions"),
            "validation_checklist": data.get("validation_checklist"),
            "full_result": data.get("full_result"),
            "created_at": now,
            "updated_at": now
        }
        result = self.supabase.table("survey_plans").insert(record).execute()
        if hasattr(result, 'error') and result.error:
            raise Exception(f"DB 저장 실패: {result.error}")
        return plan_id 