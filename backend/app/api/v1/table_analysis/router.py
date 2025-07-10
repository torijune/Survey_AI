from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from ....domain.table_analysis.use_cases import TableAnalysisUseCase
from ....domain.table_analysis.services import TableAnalysisService
from ....infrastructure.openai.client import OpenAIClient
from ....infrastructure.file.excel_loader import ExcelLoader
from ....infrastructure.statistics.statistical_tester import StatisticalTester

router = APIRouter(prefix="/table-analysis", tags=["table-analysis"])

@router.post("/")
async def analyze_table(
    file: UploadFile = File(...),
    analysis_type: bool = Form(True),
    selected_key: str = Form(""),
    lang: str = Form("한국어"),
    user_id: str = Form(None)
):
    try:
        openai_client = OpenAIClient()
        excel_loader = ExcelLoader()
        statistical_tester = StatisticalTester()
        service = TableAnalysisService(openai_client, excel_loader, statistical_tester)
        use_case = TableAnalysisUseCase(service)
        options = {
            "analysis_type": analysis_type,
            "selected_key": selected_key,
            "lang": lang,
            "user_id": user_id
        }
        file_content = await file.read()
        result = await use_case.execute(file_content, file.filename, options)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 