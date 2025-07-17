from .entities import SurveyTable, TableParseResponse
import pandas as pd
from typing import Any

class VisualizationService:
    """
    Visualization 도메인 서비스: 엑셀 파일 파싱 및 SurveyTable 데이터 추출
    """
    def parse_excel_file(self, file_content: bytes) -> TableParseResponse:
        """
        엑셀 파일을 파싱하여 테이블 데이터로 변환
        """
        try:
            df = pd.read_excel(file_content)
            return TableParseResponse(
                columns=list(df.columns),
                data=df.values.tolist(),
                question_text="업로드된 테이블",
                question_key="Q1"
            )
        except Exception as e:
            raise ValueError(f"엑셀 파일 파싱 실패: {str(e)}")

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