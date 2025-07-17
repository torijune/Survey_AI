from typing import Optional, Dict, Any, List, Union
from pydantic import BaseModel
import pandas as pd


class AgentState:
    """Agent 상태를 관리하는 클래스"""
    def __init__(self, **kwargs):
        self.query = kwargs.get("query", "")
        self.file_path = kwargs.get("file_path", "")
        self.analysis_type = kwargs.get("analysis_type", True)
        self.selected_question = kwargs.get("selected_question", "")
        self.selected_table = kwargs.get("selected_table", None)
        self.selected_key = kwargs.get("selected_key", "")
        self.anchor = kwargs.get("anchor", [])
        self.linearized_table = kwargs.get("linearized_table", "")
        self.numeric_analysis = kwargs.get("numeric_analysis", "")
        self.table_analysis = kwargs.get("table_analysis", "")
        self.revised_analysis = kwargs.get("revised_analysis", "")
        self.hallucination_check = kwargs.get("hallucination_check", "")
        self.hallucination_reject_num = kwargs.get("hallucination_reject_num", 0)
        self.feedback = kwargs.get("feedback", "")
        self.polishing_result = kwargs.get("polishing_result", "")
        self.generated_hypotheses = kwargs.get("generated_hypotheses", "")
        self.uploaded_file = kwargs.get("uploaded_file", None)
        self.raw_data_file = kwargs.get("raw_data_file", None)
        self.raw_data = kwargs.get("raw_data", None)
        self.raw_variables = kwargs.get("raw_variables", None)
        self.raw_code_guide = kwargs.get("raw_code_guide", None)
        self.raw_question = kwargs.get("raw_question", None)
        self.test_type = kwargs.get("test_type", None)
        self.ft_test_result = kwargs.get("ft_test_result", {})
        self.ft_test_summary = kwargs.get("ft_test_summary", "")
        self.ft_error = kwargs.get("ft_error", None)
        self.lang = kwargs.get("lang", "한국어")
        self.tables = kwargs.get("tables", {})
        self.question_texts = kwargs.get("question_texts", {})
        self.question_keys = kwargs.get("question_keys", [])
        self.revised_analysis_history = kwargs.get("revised_analysis_history", [])
        self.user_id = kwargs.get("user_id", None)
        self.survey_data = kwargs.get("survey_data", None)
        self.use_statistical_test = kwargs.get("use_statistical_test", True)


class TableAnalysisRequest(BaseModel):
    """테이블 분석 요청 모델"""
    analysis_type: bool = True
    selected_key: str = ""
    lang: str = "한국어"
    user_id: Optional[str] = None


class TableAnalysisResponse(BaseModel):
    """테이블 분석 응답 모델"""
    success: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class TableAnalysisResult(BaseModel):
    """테이블 분석 결과 모델"""
    polishing_result: str
    table_analysis: str
    ft_test_summary: str
    generated_hypotheses: str
    anchor: List[str]
    revised_analysis_history: List[str]
    test_type: str
    ft_test_result: Dict[str, Any] 