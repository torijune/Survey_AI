from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.single_analysis.domain.use_cases import TableAnalysisUseCase
from app.single_analysis.domain.services import TableAnalysisService
from app.single_analysis.infra.openai_client import OpenAIClient
from app.single_analysis.infra.excel_loader import ExcelLoader
from app.single_analysis.infra.statistical_test import StatisticalTester

router = APIRouter(prefix="", tags=["single-analysis"])

@router.post("/analyze")
async def analyze_table(
    file: UploadFile = File(...),
    analysis_type: bool = Form(True),
    selected_key: str = Form(""),
    lang: str = Form("한국어"),
    user_id: str = Form(None),
    use_statistical_test: str = Form("true")
):
    try:
        openai_client = OpenAIClient()
        excel_loader = ExcelLoader()
        statistical_tester = StatisticalTester()
        service = TableAnalysisService(openai_client, excel_loader, statistical_tester)
        use_case = TableAnalysisUseCase(service)
        use_statistical_test_bool = use_statistical_test.lower() == "true"
        options = {
            "analysis_type": analysis_type,
            "selected_key": selected_key,
            "lang": lang,
            "user_id": user_id,
            "use_statistical_test": use_statistical_test_bool
        }
        if not use_statistical_test_bool:
            print(f"[table_analysis] manual mode - raw data 없이 분석 진행")
        file_content = await file.read()
        result = await use_case.execute(file_content, file.filename or "unknown_file", options)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 