from typing import List
from app.fgi_rag.domain.entities import FGIRagQuery, FGIRagResult, FGIRagAnalysisResult
from app.fgi_rag.domain.services import FGIRagService

class FGIRagAnalysisUseCase:
    """FGI RAG 주제별 분석 유스케이스"""
    def __init__(self, rag_service: FGIRagService):
        self.rag_service = rag_service

    async def execute(self, query: FGIRagQuery) -> FGIRagAnalysisResult:
        results: List[FGIRagResult] = []
        try:
            for topic in query.topics:
                # 관련 청크 검색 (user_id가 None이면 빈 문자열로 변환)
                user_id = query.user_id if query.user_id is not None else ""
                chunks = await self.rag_service.search_chunks(query.file_id, topic, user_id)
                context = "\n---\n".join([c.chunk_text for c in chunks])
                # LLM 분석
                answer = await self.rag_service.analyze_topic(topic, context, query.analysis_tone)
                results.append(FGIRagResult(topic=topic, result=answer, context_chunks=chunks, analysis_tone=query.analysis_tone))
            return FGIRagAnalysisResult(success=True, results=results, query=query)
        except Exception as e:
            return FGIRagAnalysisResult(success=False, results=results, query=query, error=str(e)) 