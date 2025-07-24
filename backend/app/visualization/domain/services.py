from .entities import SurveyTable, TableParseResponse
from app.visualization.infra.excel_loader import ExcelLoader
import pandas as pd
from typing import Any, Dict, List

class VisualizationService:
    """
    Visualization 도메인 서비스: 엑셀 파일 파싱 및 SurveyTable 데이터 추출
    """
    def __init__(self):
        self.excel_loader = ExcelLoader()
    
    def parse_excel_file(self, file_content: bytes, file_name: str = "uploaded_file.xlsx") -> TableParseResponse:
        """
        엑셀 파일을 파싱하여 테이블 데이터로 변환 (single_analysis와 동일한 로직)
        """
        try:
            # single_analysis와 동일한 방식으로 테이블 파싱
            parsed_data = self.excel_loader.load_survey_tables(file_content, file_name)
            
            # 첫 번째 테이블을 기본으로 사용
            if parsed_data["tables"]:
                first_key = parsed_data["question_keys"][0]
                table = parsed_data["tables"][first_key]
                question_text = parsed_data["question_texts"][first_key]
                
                return TableParseResponse(
                    columns=list(table.columns),
                    data=table.values.tolist(),
                    question_text=question_text,
                    question_key=first_key
                )
            else:
                # 테이블이 없는 경우 기본 응답
                return TableParseResponse(
                    columns=[],
                    data=[],
                    question_text="파싱된 테이블이 없습니다",
                    question_key="NO_DATA"
                )
                
        except Exception as e:
            print(f"ExcelLoader 파싱 실패: {str(e)}")  # 디버깅용 로그
            # 파싱 실패 시 기본 pandas 파싱으로 fallback
            try:
                import io
                df = pd.read_excel(io.BytesIO(file_content))
                return TableParseResponse(
                    columns=list(df.columns),
                    data=df.values.tolist(),
                    question_text="업로드된 테이블",
                    question_key="Q1"
                )
            except Exception as fallback_error:
                raise ValueError(f"엑셀 파일 파싱 실패: {str(e)} (fallback도 실패: {str(fallback_error)})")

    def get_table_data(self, table: SurveyTable) -> dict:
        """
        SurveyTable 객체에서 표 데이터만 추출하여 반환
        """
        return {
            "columns": table.columns,
            "data": table.data,
            "question_text": table.question_text,
            "question_key": table.question_key
        }
    
    def get_all_tables(self, file_content: bytes, file_name: str = "uploaded_file.xlsx") -> Dict[str, Any]:
        """
        모든 테이블 정보를 반환 (single_analysis와 동일한 구조)
        """
        try:
            return self.excel_loader.load_survey_tables(file_content, file_name)
        except Exception as e:
            raise ValueError(f"엑셀 파일 파싱 실패: {str(e)}")
    
    def get_all_questions(self, file_content: bytes, file_name: str = "uploaded_file.xlsx") -> List[Dict[str, str]]:
        """
        엑셀 파일에서 모든 질문 목록을 추출
        """
        try:
            parsed_data = self.excel_loader.load_survey_tables(file_content, file_name)
            questions = []
            
            for key in parsed_data["question_keys"]:
                questions.append({
                    "key": key,
                    "text": parsed_data["question_texts"][key]
                })
            
            return questions
        except Exception as e:
            print(f"질문 목록 추출 실패: {str(e)}")
            return []
    
    def get_question_data(self, file_content: bytes, file_name: str, question_key: str) -> dict:
        """
        특정 질문의 데이터를 추출
        """
        try:
            parsed_data = self.excel_loader.load_survey_tables(file_content, file_name)
            
            if question_key in parsed_data["tables"]:
                table = parsed_data["tables"][question_key]
                question_text = parsed_data["question_texts"][question_key]
                
                return {
                    "columns": list(table.columns),
                    "data": table.values.tolist(),
                    "question_text": question_text,
                    "question_key": question_key
                }
            else:
                raise ValueError(f"질문 키 '{question_key}'를 찾을 수 없습니다")
                
        except Exception as e:
            raise ValueError(f"질문 데이터 추출 실패: {str(e)}") 