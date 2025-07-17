from app.visualization.domain.entities import SurveyTable
from app.visualization.domain.services import VisualizationService
from typing import Dict, Any

class AnalyzeTableUseCase:
    def __init__(self, service: VisualizationService):
        self.service = service

    async def execute(self, table: SurveyTable) -> Dict[str, Any]:
        table_data = self.service.get_table_data(table)
        return {
            "table_data": table_data,
            "table_info": {
                "question_text": table.question_text,
                "question_key": table.question_key,
                "data_shape": f"{len(table.data)} rows x {len(table.columns)} columns"
            }
        }

class SaveVisualizationUseCase:
    def __init__(self, repository):
        self.repository = repository

    async def execute(self, visualization_data: Dict[str, Any]) -> str:
        # Save visualization result to database
        return await self.repository.save_visualization(visualization_data)