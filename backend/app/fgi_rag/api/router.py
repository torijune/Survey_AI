from fastapi import APIRouter, Form, HTTPException
from typing import List, Optional
from app.fgi_rag.application.workflow import FGIRagWorkflow
from utils.supabase_client import get_supabase
from app.fgi.infra.openai_client import OpenAIClient

router = APIRouter(prefix="/fgi-rag", tags=["FGI RAG"])

# 의존성 주입 함수
def get_fgi_rag_workflow():
    supabase = get_supabase()
    llm_client = OpenAIClient()
    return FGIRagWorkflow(supabase, llm_client)

@router.post("/analyze")
async def analyze_fgi_rag(
    file_id: str = Form(...),
    topics: str = Form(...),  # JSON string
    user_id: Optional[str] = Form(None),
    analysis_tone: str = Form("설명 중심")
):
    """FGI RAG 주제별 분석"""
    import json
    try:
        workflow = get_fgi_rag_workflow()
        topic_list = json.loads(topics)
        query_dict = {
            "file_id": file_id,
            "topics": topic_list,
            "user_id": user_id,
            "analysis_tone": analysis_tone
        }
        result = await workflow.execute(query_dict)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 