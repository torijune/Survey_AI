from typing import List
from app.fgi_rag.domain.entities import FGIRagQuery, FGIRagResult, FGIRagChunk

class FGIRagService:
    """FGI RAG 비즈니스 로직 서비스"""
    def __init__(self, rag_repository, llm_client):
        self.rag_repository = rag_repository
        self.llm_client = llm_client

    async def search_chunks(self, file_id: str, topic: str, user_id: str = None, top_k: int = 5) -> List[FGIRagChunk]:
        """임베딩 기반으로 관련 청크 검색"""
        return await self.rag_repository.search_chunks(file_id, topic, user_id, top_k)

    async def analyze_topic(self, topic: str, context: str, analysis_tone: str = "설명 중심") -> str:
        """LLM을 이용한 주제별 분석/요약"""
        prompt = self._build_prompt(topic, context, analysis_tone)
        messages = [
            {"role": "system", "content": "FGI 회의록 기반 전문가. context에 없는 내용은 모른다고 답해."},
            {"role": "user", "content": prompt}
        ]
        return await self.llm_client.call(messages)

    def _build_prompt(self, topic: str, context: str, analysis_tone: str) -> str:
        if analysis_tone == "키워드 중심":
            return f"""
            회의 내용:
            {context}
            
            질문: 회의에서 '{topic}'에 대해 논의된 주요 키워드, 참여자들이 제시한 핵심 주제, 의견을 간략하게 키워드/주제 위주로 정리해줘.
            
            답변:
            """
        else:
            return f"""
            회의 내용:
            {context}
            
            질문: 회의에서 '{topic}'에 대해 참여자들이 어떤 의견을 제시하고 논의했는지 자연어로 키워드 및 중심 주제들에 대해서 요약 및 설명해줘.
            
            답변:
            """