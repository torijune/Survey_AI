from typing import Dict, Any, Optional, List
from app.fgi.domain.entities import FGIState, FGIAnalysisResult
from app.fgi.domain.services import FGIAnalysisService
from app.fgi.api.progress_utils import update_fgi_progress
from app.fgi.api.ws_router import ws_send_progress
import uuid


class FGIAnalysisUseCase:
    """FGI 분석 유스케이스"""
    
    def __init__(self, fgi_service: FGIAnalysisService):
        self.fgi_service = fgi_service
    
    async def execute_fgi_analysis(self, file_content: bytes, file_name: str, 
                                 options: Optional[Dict[str, Any]] = None) -> FGIAnalysisResult:
        """FGI 분석 실행"""
        try:
            on_step = options.get("on_step") if options else None
            job_id = options.get("job_id") if options and options.get("job_id") else str(uuid.uuid4())
            
            # 1. 초기 상태 생성
            state = FGIState(
                file_content=file_content,
                file_name=file_name
            )
            
            # 2. 파일 확장자에 따른 텍스트 추출
            if file_name.lower().endswith('.docx'):
                state = await self.fgi_service.extract_text_from_docx(state)
            elif file_name.lower().endswith('.txt'):
                state = await self.fgi_service.extract_text_from_txt(state)
            else:
                raise Exception("지원하지 않는 파일 형식입니다. DOCX 또는 TXT 파일을 사용해주세요.")
            
            # 3. FGI 분석 실행
            result = await self._analyze_fgi(state, on_step, job_id)
            
            return FGIAnalysisResult(
                success=True,
                chunk_summaries=result["chunk_summaries"],
                final_summary=result["final_summary"],
                chunk_details=result["chunk_details"]
            )
            
        except Exception as e:
            return FGIAnalysisResult(
                success=False,
                chunk_summaries=[],
                final_summary="",
                chunk_details=[],
                error=str(e)
            )
    
    async def _analyze_fgi(self, state: FGIState, on_step=None, job_id=None) -> Dict[str, Any]:
        """FGI 분석 실행 (내부 메서드)"""
        import asyncio
        if on_step:
            on_step('[FGI] Q&A 블록 단위로 청킹 시작')
        print('[FGI] Q&A 블록 단위로 청킹 시작')
        if job_id:
            await update_fgi_progress(job_id, '청킹 시작', 0, 0)
            print(f'[FGI] WebSocket 메시지 전송: 청킹 시작 (job_id: {job_id})')  # 디버깅 로그 추가
            await ws_send_progress(job_id, {"progress": "청킹 시작", "current": 0, "total": 0})
        if not state.extracted_text:
            raise ValueError("추출된 텍스트가 없습니다.")
        
        # Q&A 블록 추출
        chunks = self.fgi_service.extract_qa_blocks(state.extracted_text)
        if not chunks:
            chunks = self.fgi_service.split_text(state.extracted_text, 4000)
        
        # 3개씩 묶어서 메가 청크 생성
        mega_chunks = self.fgi_service.merge_chunks(chunks, 3)
        total = len(mega_chunks)
        if on_step:
            on_step(f'[FGI] 총 {total}개 메가 청크 생성 완료')
        print(f'[FGI] 총 {total}개 메가 청크 생성 완료')
        if job_id:
            await update_fgi_progress(job_id, f'총 {total}개 메가 청크 생성 완료', 0, total)
            print(f'[FGI] WebSocket 메시지 전송: 총 {total}개 메가 청크 생성 완료 (job_id: {job_id})')  # 디버깅 로그 추가
            await ws_send_progress(job_id, {"progress": f"총 {total}개 메가 청크 생성 완료", "current": 0, "total": total})
        
        # 각 청크 분석
        chunk_summaries = []
        for i, chunk in enumerate(mega_chunks):
            if on_step:
                on_step(f'[FGI] 청크 {i+1}/{total} 분석 중...')
            print(f'[FGI] 청크 {i+1}/{total} 분석 중...')
            if job_id:
                await update_fgi_progress(job_id, f'청크 {i+1}/{total} 분석 중...', i+1, total)
                print(f'[FGI] WebSocket 메시지 전송: 청크 {i+1}/{total} 분석 중... (job_id: {job_id})')  # 디버깅 로그 추가
                await ws_send_progress(job_id, {"progress": f"청크 {i+1}/{total} 분석 중...", "current": i+1, "total": total})
            try:
                summary = await self.fgi_service.analyze_chunk_with_llm(chunk, on_step)
                chunk_summaries.append({
                    "chunk_index": i,
                    "summary": summary,
                    "original_text": chunk[:500] + "..." if len(chunk) > 500 else chunk
                })
                # 각 청크 요약 결과를 WebSocket으로 전송
                if job_id:
                    await ws_send_progress(job_id, {
                        "progress": f"청크 {i+1}/{total} 요약 완료",
                        "current": i+1,
                        "total": total,
                        "chunk_index": i,
                        "chunk_summary": summary
                    })
            except Exception as e:
                print(f'[FGI] 청크 {i+1} 분석 실패: {str(e)}')
                chunk_summaries.append({
                    "chunk_index": i,
                    "summary": f"분석 실패: {str(e)}",
                    "original_text": chunk[:500] + "..." if len(chunk) > 500 else chunk
                })
                if job_id:
                    await ws_send_progress(job_id, {
                        "progress": f"청크 {i+1}/{total} 분석 실패",
                        "current": i+1,
                        "total": total,
                        "chunk_index": i,
                        "chunk_summary": f"분석 실패: {str(e)}"
                    })
            if job_id:
                await update_fgi_progress(job_id, f'청크 {i+1}/{total} 분석 완료', i+1, total)
                print(f'[FGI] WebSocket 메시지 전송: 청크 {i+1}/{total} 분석 완료 (job_id: {job_id})')  # 디버깅 로그 추가
                await ws_send_progress(job_id, {
                    "progress": f"청크 {i+1}/{total} 분석 완료",
                    "current": i+1,
                    "total": total,
                    "chunk_index": i,
                    "chunk_summary": chunk_summaries[-1]["summary"]
                })
            await asyncio.sleep(0.1)  # 너무 빠른 업데이트 방지
        
        # 최종 요약 생성
        if on_step:
            on_step('[FGI] 최종 요약 생성 중...')
        print('[FGI] 최종 요약 생성 중...')
        if job_id:
            await update_fgi_progress(job_id, '최종 요약 생성 중...', total, total)
            print(f'[FGI] WebSocket 메시지 전송: 최종 요약 생성 중... (job_id: {job_id})')  # 디버깅 로그 추가
            await ws_send_progress(job_id, {"progress": "최종 요약 생성 중...", "current": total, "total": total})
        all_summaries = '\n\n'.join([cs["summary"] for cs in chunk_summaries])
        
        try:
            final_summary = await self.fgi_service.create_final_summary_with_llm(
                all_summaries, 
                on_step
            )
        except Exception as e:
            print(f'[FGI] 최종 요약 생성 실패: {str(e)}')
            final_summary = f"최종 요약 생성 실패: {str(e)}"
        
        if on_step:
            on_step('[FGI] 분석 완료')
        print('[FGI] 분석 완료')
        if job_id:
            await update_fgi_progress(job_id, '완료!', total, total, final_summary)
            print(f'[FGI] WebSocket 메시지 전송: 완료! (job_id: {job_id})')  # 디버깅 로그 추가
            await ws_send_progress(job_id, {"progress": "완료!", "current": total, "total": total, "final_summary": final_summary})
        
        return {
            "chunk_summaries": [cs["summary"] for cs in chunk_summaries],
            "chunk_details": chunk_summaries,
            "final_summary": final_summary
        }
    
    async def extract_guide_subjects(self, file_content: bytes) -> List[str]:
        """가이드 주제 추출"""
        try:
            # LLM 기반 추출 시도
            subjects = await self.fgi_service.extract_guide_subjects_llm(file_content)
            if subjects:
                return subjects
            
            # LLM 실패 시 rule-based fallback
            return self.fgi_service.extract_guide_subjects_rule_based(file_content)
            
        except Exception as e:
            print(f"[FGI] 가이드 주제 추출 실패: {e}")
            return [] 