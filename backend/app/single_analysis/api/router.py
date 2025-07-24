from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.single_analysis.domain.use_cases import TableAnalysisUseCase
from app.single_analysis.domain.services import TableAnalysisService
from app.single_analysis.infra.openai_client import OpenAIClient
from app.single_analysis.infra.excel_loader import ExcelLoader
from app.single_analysis.infra.statistical_test import StatisticalTester

router = APIRouter(prefix="", tags=["single-analysis"])

@router.post("/parse")
async def parse_table(
    file: UploadFile = File(...),
    analysis_type: str = Form("parse")
):
    """테이블 파싱 엔드포인트"""
    try:
        print(f"[parse] 파일명: {file.filename}")
        excel_loader = ExcelLoader()
        file_content = await file.read()
        print(f"[parse] 파일 크기: {len(file_content)} bytes")
        
        parsed_data = excel_loader.load_survey_tables(file_content, file.filename or "unknown_file")
        print(f"[parse] 파싱된 질문 키: {parsed_data['question_keys']}")
        print(f"[parse] 파싱된 테이블 수: {len(parsed_data['tables'])}")
        
        # DataFrame을 JSON으로 변환할 때 NaN 값을 처리
        def convert_dataframe_to_dict(df):
            if hasattr(df, 'to_dict'):
                return df.to_dict(orient="records")
            return df
        
        # NaN 값을 None으로 변환하는 함수
        def clean_nan_values(data):
            if isinstance(data, dict):
                return {k: clean_nan_values(v) for k, v in data.items()}
            elif isinstance(data, list):
                return [clean_nan_values(item) for item in data]
            elif isinstance(data, float) and (data != data or data == float('inf') or data == float('-inf')):
                return None
            return data
        
        tables_dict = {}
        for k, v in parsed_data["tables"].items():
            print(f"[parse] 테이블 {k} 처리 중...")
            if hasattr(v, 'to_dict'):
                # DataFrame을 프론트엔드가 기대하는 구조로 변환
                table_dict = v.to_dict(orient="records")
                # columns와 data를 분리
                if table_dict:
                    columns = list(table_dict[0].keys())
                    data = [list(row.values()) for row in table_dict]
                    tables_dict[k] = {
                        "columns": columns,
                        "data": clean_nan_values(data)
                    }
                else:
                    tables_dict[k] = {
                        "columns": [],
                        "data": []
                    }
                print(f"[parse] 테이블 {k} 완료 - 행 수: {len(table_dict)}")
            else:
                tables_dict[k] = v
                print(f"[parse] 테이블 {k} 완료 - DataFrame이 아님")
        
        result = {
            "success": True,
            "question_keys": parsed_data["question_keys"],
            "question_texts": parsed_data["question_texts"],
            "tables": tables_dict
        }
        
        print(f"[parse] 응답 완료 - 질문 수: {len(result['question_keys'])}")
        return result
    except Exception as e:
        print(f"[parse] 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/recommend-test-types")
async def recommend_test_types(
    file: UploadFile = File(...),
    analysis_type: str = Form("recommend_test_types"),
    lang: str = Form("한국어"),
    use_statistical_test: str = Form("true")
):
    """통계 검정 방법 추천 엔드포인트"""
    try:
        excel_loader = ExcelLoader()
        openai_client = OpenAIClient()
        file_content = await file.read()
        
        # 파일 파싱
        parsed_data = excel_loader.load_survey_tables(file_content, file.filename or "unknown_file")
        question_keys = parsed_data["question_keys"]
        question_texts = parsed_data["question_texts"]
        tables = parsed_data["tables"]
        
        # 통계 검정 미사용 시 모든 질문을 manual로 설정
        if use_statistical_test.lower() != "true":
            test_type_map = {key: "manual" for key in question_keys}
            return {
                "success": True,
                "test_type_map": test_type_map
            }
        
        # 통계 검정 사용 시 LLM으로 추천
        test_type_map = {}
        for key in question_keys:
            if key in tables and key in question_texts:
                table = tables[key]
                question_text = question_texts[key]
                
                # LLM으로 통계 검정 방법 추천
                prompt = f"""
당신은 통계 전문가입니다.

아래는 설문 문항과 열 이름 목록입니다.

문항: {question_text}
열 이름: {', '.join(table.columns.tolist())}

당신의 임무는, 이 문항이 아래 중 어떤 통계 분석 유형에 해당하는지 분류하는 것입니다.

📋 분류 기준:

1️⃣ **manual** (복수응답/다중응답/순위형):
    - 한 응답자가 여러 항목을 선택하거나, 여러 순위를 동시에 응답하는 경우
    - 예시: "복수응답", "다중응답", "1+2순위", "1+2+3순위", "ranking", "우선순위(1+2)", "다중선택", "모두선택"
    - 문항에 "복수", "다중", "multiple", "ranking" 등이 포함된 경우

2️⃣ **ft_test** (연속형 수치 응답):
    - 문항이 1~5점 척도, 평균, 비율, 점수 등 숫자 기반으로 요약되어 있는 경우
    - 예시 열 이름: "평균", "만족도 점수", "~% 비율", "5점 척도", "평균 점수", "관심도 평균"
    - "전혀 관심이 없다", "매우 관심 있다" 등은 실제로는 선택지이지만, 빈도나 비율로 수치화되었을 경우 → 연속형으로 판단

3️⃣ **chi_square** (범주형 선택 응답):
    - 문항이 응답자들이 특정 항목을 **선택**하거나 **다중선택**한 결과일 경우
    - 예시 열 이름: "주요 이용시설", "선택 이유", "가장 많이 선택한 장소", "다중 응답"
    - 단일 선택 문항 (한 명이 한 항목만 선택하는 경우)

아래 중 하나로만 답변하세요(설명 없이):
- manual
- ft_test  
- chi_square
"""
                
                messages = [
                    {"role": "system", "content": "당신은 통계 분석 전문가입니다."},
                    {"role": "user", "content": prompt}
                ]
                
                response = await openai_client.call(messages)
                test_type = response.strip().lower()
                
                # 응답 검증
                if test_type not in ["manual", "ft_test", "chi_square"]:
                    test_type = "ft_test"  # 기본값
                
                test_type_map[key] = test_type
        
        return {
            "success": True,
            "test_type_map": test_type_map
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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