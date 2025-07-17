from typing import List, Optional
from app.fgi_rag.domain.entities import FGIRagChunk

class FGIRagRepository:
    """FGI RAG 임베딩 검색/DB 연동 저장소"""
    def __init__(self, supabase_client):
        self.supabase = supabase_client

    async def search_chunks(self, file_id: str, topic: str, user_id: Optional[str] = None, top_k: int = 5) -> List[FGIRagChunk]:
        # 실제 supabase RPC 호출/임베딩 검색 로직 구현 필요
        # 아래는 예시 (실제 구현에 맞게 수정 필요)
        topic_embedding = await self.supabase.get_embedding(topic)
        rpc_res = self.supabase.rpc("match_fgi_doc_embeddings", {
            "query_embedding": topic_embedding,
            "match_count": top_k,
            "p_user_id": user_id,
            "p_file_id": file_id
        }).execute()
        chunks = []
        for c in getattr(rpc_res, 'data', []):
            chunks.append(FGIRagChunk(chunk_text=c["chunk_text"], similarity_score=c.get("similarity", 0.0), chunk_id=c.get("chunk_id")))
        return chunks 