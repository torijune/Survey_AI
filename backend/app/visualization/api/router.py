from fastapi import APIRouter, UploadFile, File, HTTPException
from app.visualization.domain.entities import SurveyTable
from app.visualization.domain.use_cases import SaveVisualizationUseCase
from app.visualization.infra.visualization_repository import VisualizationRepository
from app.visualization.domain.entities import VisualizationData, VisualizationResponse
import pandas as pd
from typing import Dict, Any

router = APIRouter(prefix="", tags=["Visualization"])

@router.post("/parse-table")
async def parse_table(file: UploadFile = File(...)):
    try:
        df = pd.read_excel(await file.read())
        return {
            "columns": list(df.columns),
            "data": df.values.tolist(),
            "question_text": "질문 예시",
            "question_key": "Q1"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save", response_model=VisualizationResponse)
async def save_visualization(data: VisualizationData):
    try:
        repository = VisualizationRepository()
        use_case = SaveVisualizationUseCase(repository)
        visualization_id = await use_case.execute(data.dict())
        return VisualizationResponse(id=visualization_id, message="시각화가 성공적으로 저장되었습니다.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))