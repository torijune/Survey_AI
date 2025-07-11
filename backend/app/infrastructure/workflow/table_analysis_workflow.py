from typing import Dict, Any, Optional
from app.domain.table_analysis.use_cases import TableAnalysisUseCase
from app.domain.table_analysis.services import TableAnalysisService
from app.infrastructure.openai.client import OpenAIClient
from app.infrastructure.file.excel_loader import ExcelLoader
from app.infrastructure.statistics.statistical_tester import StatisticalTester

class TableAnalysisWorkflow:
    """Clean Architecture 기반 테이블 분석 워크플로우 어댑터"""
    def __init__(self):
        self.openai_client = OpenAIClient()
        self.excel_loader = ExcelLoader()
        self.statistical_tester = StatisticalTester()
        self.service = TableAnalysisService(self.openai_client, self.excel_loader, self.statistical_tester)
        self.use_case = TableAnalysisUseCase(self.service)

    async def load_survey_tables(self, file_content: bytes, file_name: str) -> Dict[str, Any]:
        """설문 테이블 로드"""
        # ExcelLoader의 load_survey_tables 직접 사용
        return self.excel_loader.load_survey_tables(file_content, file_name)

    async def decide_batch_test_types(self, question_infos: list, lang: str = "한국어") -> dict:
        """배치 분석용: 여러 질문에 대해 통계 검정 방법을 일괄 결정"""
        try:
            # Clean Architecture 서비스의 decide_batch_test_types 메서드 사용
            return await self.service.decide_batch_test_types(question_infos, lang)
        except Exception as e:
            print(f"[decide_batch_test_types] 오류: {e}")
            # fallback: 모든 질문을 ft_test로 설정
            return {q["key"]: "ft_test" for q in question_infos}

    async def execute(self, file_content: bytes, file_name: str, options: Dict[str, Any], raw_data_content: Optional[bytes] = None, raw_data_filename: Optional[str] = None) -> Dict[str, Any]:
        """테이블 분석 실행 (단일)"""
        kwargs = {}
        if raw_data_content is not None:
            kwargs["raw_data_content"] = raw_data_content
        if raw_data_filename is not None:
            kwargs["raw_data_filename"] = raw_data_filename
        
        # use_statistical_test가 options에 있으면 그대로 전달
        if "use_statistical_test" in options:
            kwargs["use_statistical_test"] = options["use_statistical_test"]
        
        return await self.use_case.execute(file_content, file_name, options, **kwargs)

    async def execute_batch(self, file_content: bytes, file_name: str, test_type_map: Dict[str, str], lang: str = "한국어", user_id: Optional[str] = None, raw_data_content: Optional[bytes] = None, raw_data_filename: Optional[str] = None, use_statistical_test: bool = True) -> Dict[str, Any]:
        """배치 분석 실행 (여기서는 각 질문별로 use_case.execute를 반복 호출)"""
        # 테이블 파싱
        parsed = self.excel_loader.load_survey_tables(file_content, file_name)
        tables = parsed["tables"]
        question_texts = parsed["question_texts"]
        question_keys = parsed["question_keys"]
        results = {}
        for key in question_keys:
            current_test_type = test_type_map.get(key, "ft_test")
            if not use_statistical_test:
                current_test_type = "manual"
            options = {
                "analysis_type": False,
                "selected_key": key,
                "lang": lang,
                "user_id": user_id,
                "use_statistical_test": use_statistical_test,
                "test_type": current_test_type
            }
            kwargs = {}
            if use_statistical_test and current_test_type in ["ft_test", "chi_square"]:
                if raw_data_content is not None:
                    kwargs["raw_data_content"] = raw_data_content
                if raw_data_filename is not None:
                    kwargs["raw_data_filename"] = raw_data_filename
            result = await self.use_case.execute(
                file_content=file_content,
                file_name=file_name,
                options=options,
                **kwargs
            )
            results[key] = result["result"] if result["success"] else {"error": result.get("error")}
        return {"success": True, "result": results} 