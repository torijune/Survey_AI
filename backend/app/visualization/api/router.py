from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends, Header
from app.visualization.domain.entities import SurveyTable, TableParseResponse, QuestionListResponse, QuestionDataResponse
from app.visualization.domain.use_cases import SaveVisualizationUseCase
from app.visualization.domain.services import VisualizationService
from app.visualization.infra.visualization_repository import VisualizationRepository
from app.visualization.domain.entities import VisualizationData, VisualizationResponse
from app.utils.auth import get_current_user
from typing import Dict, Any, Optional, List

router = APIRouter(prefix="", tags=["Visualization"])

@router.post("/parse-table", response_model=TableParseResponse)
async def parse_table(file: UploadFile = File(...)):
    try:
        service = VisualizationService()
        file_content = await file.read()
        result = service.parse_excel_file(file_content, file.filename)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save", response_model=VisualizationResponse)
async def save_visualization(data: VisualizationData):
    try:
        # 사용자 ID가 데이터에 포함되어 있는지 확인
        if not data.user_id:
            raise HTTPException(status_code=400, detail="User ID is required")
        
        repository = VisualizationRepository()
        use_case = SaveVisualizationUseCase(repository)
        visualization_id = await use_case.execute(data.dict())
        return VisualizationResponse(id=visualization_id, message="시각화가 성공적으로 저장되었습니다.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list", response_model=List[Dict[str, Any]])
async def get_visualizations(current_user: Dict = Depends(get_current_user)):
    """사용자의 시각화 목록 조회"""
    try:
        repository = VisualizationRepository()
        visualizations = await repository.get_visualizations_by_user(current_user.get("id"))
        return visualizations
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{visualization_id}", response_model=Dict[str, Any])
async def get_visualization(visualization_id: str, current_user: Dict = Depends(get_current_user)):
    """특정 시각화 조회"""
    try:
        repository = VisualizationRepository()
        visualization = await repository.get_visualization_by_id(visualization_id)
        if not visualization:
            raise HTTPException(status_code=404, detail="시각화를 찾을 수 없습니다.")
        
        # 사용자 권한 확인
        if visualization.get("user_id") != current_user.get("id"):
            raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")
            
        return visualization
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/questions", response_model=QuestionListResponse)
async def get_questions(file: UploadFile = File(...)):
    """파일에서 모든 질문 목록을 가져오기"""
    try:
        service = VisualizationService()
        file_content = await file.read()
        questions = service.get_all_questions(file_content, file.filename)
        return QuestionListResponse(questions=questions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/question-data", response_model=QuestionDataResponse)
async def get_question_data(file: UploadFile = File(...), question_key: str = Form(...)):
    """특정 질문의 데이터를 가져오기"""
    try:
        service = VisualizationService()
        file_content = await file.read()
        data = service.get_question_data(file_content, file.filename, question_key)
        return QuestionDataResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))