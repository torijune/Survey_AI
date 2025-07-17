from app.fgi_rag.domain.use_cases import FGIRagAnalysisUseCase
from app.fgi_rag.domain.services import FGIRagService
from app.fgi_rag.infra.rag_repository import FGIRagRepository
from typing import Dict, Any

class FGIRagWorkflow:
    """FGI RAG 워크플로우"""
    def __init__(self, supabase_client, llm_client):
        self.repository = FGIRagRepository(supabase_client)
        self.service = FGIRagService(self.repository, llm_client)
        self.use_case = FGIRagAnalysisUseCase(self.service)

    async def execute(self, query_dict: Dict[str, Any]) -> Dict[str, Any]:
        from app.fgi_rag.domain.entities import FGIRagQuery
        query = FGIRagQuery(**query_dict)
        result = await self.use_case.execute(query)
        return {
            "success": result.success,
            "results": [
                {
                    "topic": r.topic,
                    "result": r.result,
                    "context_chunks": [c.chunk_text for c in r.context_chunks],
                    "analysis_tone": r.analysis_tone
                } for r in result.results
            ],
            "error": result.error,
            "analysis_id": result.analysis_id
        } 