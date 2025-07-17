from typing import List, Optional
from app.fgi_rag.domain.entities import FGIRagChunk

class FGIRagRepository:
    def __init__(self, supabase_client, llm_client):
        self.supabase = supabase_client
        self.llm_client = llm_client

    async def search_chunks(self, file_id: str, topic: str, user_id: Optional[str] = None, top_k: int = 5) -> List[FGIRagChunk]:
        topic_embedding = await self.llm_client.get_embedding(topic)
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