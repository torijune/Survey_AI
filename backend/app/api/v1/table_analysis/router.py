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
        
        # manual 모드일 때는 raw data 없이도 동작
        if not use_statistical_test_bool:
            print(f"[table_analysis] manual mode - raw data 없이 분석 진행")
        
        file_content = await file.read()
        result = await use_case.execute(file_content, file.filename or "unknown_file", options)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 