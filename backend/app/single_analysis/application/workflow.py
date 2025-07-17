from app.single_analysis.domain.use_cases import TableAnalysisUseCase
from app.single_analysis.domain.services import TableAnalysisService
from app.single_analysis.infra.openai_client import OpenAIClient
from app.single_analysis.infra.excel_loader import ExcelLoader
from app.single_analysis.infra.statistical_test import StatisticalTester
from typing import Dict, Any, Optional

class TableAnalysisWorkflow:
    """기존 LangGraphWorkflow와 호환성 유지"""
    def __init__(self):
        self.openai_client = OpenAIClient()
        self.excel_loader = ExcelLoader()
        self.statistical_tester = StatisticalTester()
        self.service = TableAnalysisService(self.openai_client, self.excel_loader, self.statistical_tester)
        self.use_case = TableAnalysisUseCase(self.service)

    async def execute(self, file_content: bytes, file_name: str, options: Dict[str, Any] = None, raw_data_content: bytes = None, raw_data_filename: str = None) -> Dict[str, Any]:
        return await self.use_case.execute(file_content, file_name, options, raw_data_content, raw_data_filename) 