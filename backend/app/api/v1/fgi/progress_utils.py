from utils.supabase_client import get_supabase
from typing import Optional

async def update_fgi_progress(job_id: str, progress: str, current: int, total: int, final_summary: Optional[str] = None):
    supabase = get_supabase()
    data = {
        "job_id": job_id,
        "progress": progress,
        "current": current,
        "total": total,
        "final_summary": final_summary,
    }
    # upsert (job_id 기준)
    supabase.table("fgi_progress").upsert(data, on_conflict=["job_id"]).execute() 