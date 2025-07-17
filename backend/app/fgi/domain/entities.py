from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class FGIState:
    """FGI 분석 상태를 관리하는 엔티티"""
    # 입력 데이터
    file_content: Optional[bytes] = None
    file_name: Optional[str] = None
    extracted_text: Optional[str] = None
    guide_text: Optional[str] = None
    
    # 청킹 결과
    chunks: List[str] = field(default_factory=list)
    mega_chunks: List[str] = field(default_factory=list)
    
    # 분석 결과
    chunk_summaries: List[Dict[str, Any]] = field(default_factory=list)
    final_summary: Optional[str] = None
    
    # 메타데이터
    created_at: datetime = field(default_factory=datetime.now)
    user_id: Optional[str] = None
    analysis_id: Optional[str] = None


@dataclass
class FGIChunk:
    """FGI 청크 정보"""
    index: int
    content: str
    summary: Optional[str] = None
    error: Optional[str] = None


@dataclass
class FGIAnalysisResult:
    """FGI 분석 결과"""
    success: bool
    chunk_summaries: List[str]
    final_summary: str
    chunk_details: List[Dict[str, Any]] = field(default_factory=list)
    error: Optional[str] = None
    analysis_id: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class FGIGuideSubject:
    """FGI 가이드 주제"""
    subject: str
    index: int
    extracted_by: str = "llm"  # "llm" or "rule_based" 