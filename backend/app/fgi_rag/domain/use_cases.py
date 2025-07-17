from typing import List
from app.fgi_rag.domain.entities import FGIRagQuery, FGIRagResult, FGIRagAnalysisResult
from app.fgi_rag.domain.services import FGIRagService
from app.fgi_rag.api.ws_router import ws_send_topic_progress

class FGIRagAnalysisUseCase:
    """FGI RAG 주제별 분석 유스케이스"""
    def __init__(self, rag_service: FGIRagService):
        self.rag_service = rag_service

    async def execute(self, query: FGIRagQuery) -> FGIRagAnalysisResult:
        results: List[FGIRagResult] = []
        try:
            total = len(query.topics)
            job_id = getattr(query, 'job_id', None)
            for i, topic in enumerate(query.topics):
                user_id = query.user_id if query.user_id is not None else ""
                chunks = await self.rag_service.search_chunks(query.file_id, topic, user_id)
                context = "\n---\n".join([c.chunk_text for c in chunks])
                answer = await self.rag_service.analyze_topic(topic, context, query.analysis_tone)
                results.append(FGIRagResult(topic=topic, result=answer, context_chunks=chunks, analysis_tone=query.analysis_tone))
                # 진행상황 push (job_id가 있을 때만)
                if job_id:
                    await ws_send_topic_progress(
                        job_id,
                        {
                            "current": i + 1,
                            "total": total,
                            "topic": topic,
                            "status": "completed" if i + 1 == total else "processing"
                        }
                    )
            return FGIRagAnalysisResult(success=True, results=results, query=query)
        except Exception as e:
            return FGIRagAnalysisResult(success=False, results=results, query=query, error=str(e)) 