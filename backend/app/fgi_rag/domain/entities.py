from typing import List, Optional
from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class FGIRagQuery:
    """FGI RAG 질의 엔티티"""
    file_id: str
    topics: List[str]
    user_id: Optional[str] = None
    analysis_tone: str = "설명 중심"
    created_at: datetime = field(default_factory=datetime.now)

@dataclass
class FGIRagChunk:
    """FGI RAG 검색된 청크 정보"""
    chunk_text: str
    similarity_score: float
    chunk_id: Optional[str] = None

@dataclass
class FGIRagResult:
    """FGI RAG 분석 결과 (주제별)"""
    topic: str
    result: str
    context_chunks: List[FGIRagChunk] = field(default_factory=list)
    analysis_tone: str = "설명 중심"

@dataclass
class FGIRagAnalysisResult:
    """FGI RAG 전체 분석 결과"""
    success: bool
    results: List[FGIRagResult]
    query: FGIRagQuery
    error: Optional[str] = None
    analysis_id: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now) 