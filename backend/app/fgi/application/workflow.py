from typing import Dict, Any, Optional
from app.fgi.domain.use_cases import FGIAnalysisUseCase
from app.fgi.domain.services import FGIAnalysisService
from app.fgi.infra.openai_client import OpenAIClient


class FGIWorkflowCompatibility:
    """FGI 워크플로우 호환성 레이어 (기존 fgi_workflow.py와 호환)"""
    
    def __init__(self):
        self.openai_client = OpenAIClient()
        self.fgi_service = FGIAnalysisService(self.openai_client)
        self.fgi_use_case = FGIAnalysisUseCase(self.fgi_service)
    
    async def execute(self, file_content: bytes, file_name: str, 
                     options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """기존 fgi_workflow.py와 호환되는 execute 메서드"""
        try:
            result = await self.fgi_use_case.execute_fgi_analysis(file_content, file_name, options)
            
            if result.success:
                return {
                    "success": True,
                    "result": {
                        "chunk_summaries": result.chunk_summaries,
                        "final_summary": result.final_summary
                    }
                }
            else:
                return {
                    "success": False,
                    "error": result.error
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def analyze_fgi(self, text: str, guide_text: str, on_step=None) -> Dict[str, Any]:
        """기존 analyze_fgi 메서드 호환성"""
        # 이 메서드는 기존 코드와의 호환성을 위해 유지
        # 실제로는 execute 메서드를 사용하는 것이 권장됨
        raise NotImplementedError("이 메서드는 더 이상 사용되지 않습니다. execute 메서드를 사용하세요.")
    
    async def extract_guide_subjects_from_text(self, file_content: bytes) -> list:
        """기존 extract_guide_subjects_from_text 메서드 호환성"""
        try:
            subjects = await self.fgi_use_case.extract_guide_subjects(file_content)
            return subjects
        except Exception as e:
            print(f"[FGI] 가이드 주제 추출 실패: {e}")
            return []