from app.visualization.domain.services import VisualizationService
from app.visualization.domain.use_cases import AnalyzeTableUseCase
from app.visualization.domain.entities import SurveyTable
from app.visualization.infra.visualization_repository import VisualizationRepository
from typing import Dict, Any, Optional

class VisualizationWorkflow:
    def __init__(self):
        self.service = VisualizationService()
        self.analyze_table_use_case = AnalyzeTableUseCase(self.service)
        self.repository = VisualizationRepository()

    async def analyze_and_save(self, table: SurveyTable, user_id: str, file_name: str, chart_type: str) -> Dict[str, Any]:
        result = await self.analyze_table_use_case.execute(table)
        image_base64 = result["visualizations"][chart_type]
        visualization_id = await self.repository.save_visualization({
            "user_id": user_id,
            "question_key": table.question_key,
            "question_text": table.question_text,
            "file_name": file_name,
            "chart_type": chart_type,
            "image_base64": image_base64,
            "chart_data": None  # 필요시 chart_data도 저장
        })
        return {"id": visualization_id, **result}

    async def get_visualization(self, visualization_id: str) -> Optional[Dict[str, Any]]:
        return await self.repository.get_visualization_by_id(visualization_id)