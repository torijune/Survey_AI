import asyncio
import json
import io
import re
from typing import Dict, Any, Optional, List, Union
import pandas as pd
import numpy as np
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
import os
from dotenv import load_dotenv
import openpyxl
from scipy import stats
from collections import defaultdict
import openai

load_dotenv()

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

class LangGraphWorkflow:
    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.3,
            api_key=os.getenv("OPENAI_API_KEY")
        )
    
    def normalize_key(self, key: str) -> str:
        """키 정규화"""
        return key.strip().replace(' ', '').replace('-', '').replace('_', '').replace('.', '').upper()
    
    def find_matching_key(self, target_key: str, available_keys: List[str]) -> Optional[str]:
        """키 매칭 찾기"""
        normalized_target = self.normalize_key(target_key)
        
        # 정확한 매칭
        for key in available_keys:
            if self.normalize_key(key) == normalized_target:
                return key
        
        # 포함 관계 매칭
        for key in available_keys:
            normalized_key = self.normalize_key(key)
            if normalized_key in normalized_target or normalized_target in normalized_key:
                return key
        
        # 유사도 기반 매칭 (Levenshtein distance)
        best_match = None
        best_score = float('inf')
        
        for key in available_keys:
            normalized_key = self.normalize_key(key)
            distance = self.levenshtein_distance(normalized_target, normalized_key)
            max_length = max(len(normalized_target), len(normalized_key))
            similarity = distance / max_length
            
            if similarity < 0.3 and similarity < best_score:
                best_match = key
                best_score = similarity
        
        return best_match
    
    def levenshtein_distance(self, str1: str, str2: str) -> int:
        """Levenshtein 거리 계산"""
        matrix = [[0] * (len(str2) + 1) for _ in range(len(str1) + 1)]
        
        for i in range(len(str1) + 1):
            matrix[i][0] = i
        
        for j in range(len(str2) + 1):
            matrix[0][j] = j
        
        for i in range(1, len(str1) + 1):
            for j in range(1, len(str2) + 1):
                if str1[i-1] == str2[j-1]:
                    matrix[i][j] = matrix[i-1][j-1]
                else:
                    matrix[i][j] = min(
                        matrix[i-1][j-1] + 1,
                        matrix[i][j-1] + 1,
                        matrix[i-1][j] + 1
                    )
        
        return matrix[len(str1)][len(str2)]
    
    async def load_survey_tables(self, file_content: bytes, file_name: str, sheet_name: str = "통계표"):
        """설문 테이블 로드 - DataProcessor의 load_survey_tables와 동일하게 동작하도록 수정"""
        from utils.data_processor import DataProcessor
        data_processor = DataProcessor()
        return data_processor.load_survey_tables(file_content, file_name, sheet_name)
    
    def linearize_row_wise(self, table: pd.DataFrame) -> str:
        """테이블을 행 단위로 선형화"""
        if table is None or table.empty:
            return ""
        
        # 숫자 컬럼만 선택
        numeric_cols = table.select_dtypes(include=[np.number]).columns.tolist()
        if not numeric_cols:
            return ""
        
        # 첫 번째 컬럼 (그룹명)과 숫자 컬럼들만 사용
        result_cols = [table.columns[0]] + numeric_cols
        result_df = table[result_cols]
        
        # 행 단위로 문자열 변환
        rows = []
        for _, row in result_df.iterrows():
            row_str = " | ".join([str(val) for val in row.values])
            rows.append(row_str)
        
        return "\n".join(rows)
    
    async def make_openai_call(self, messages: List[Dict[str, str]], model: str = "gpt-4o-mini", temperature: float = 0.3) -> str:
        """OpenAI API 호출"""
        try:
            langchain_messages = []
            for msg in messages:
                if msg["role"] == "system":
                    langchain_messages.append(SystemMessage(content=msg["content"]))
                else:
                    langchain_messages.append(HumanMessage(content=msg["content"]))
            
            response = await self.llm.ainvoke(langchain_messages)
            return response.content.strip()
        except Exception as e:
            raise Exception(f"OpenAI API 호출 실패: {str(e)}")
    
    async def table_parser_node(self, state: AgentState, on_step=None) -> AgentState:
        """테이블 파서 노드"""
        if on_step:
            on_step("📊 테이블 파서 노드 시작")
        
        # 파일에서 테이블 파싱
        if state.uploaded_file:
            parsed_data = await self.load_survey_tables(
                state.uploaded_file,
                state.file_path
            )
            state.tables = parsed_data["tables"]
            state.question_texts = parsed_data["question_texts"]
            state.question_keys = parsed_data["question_keys"]
        
        # 선택된 키 매칭
        if state.selected_key and state.tables:
            matching_key = self.find_matching_key(state.selected_key, list(state.tables.keys()))
            if matching_key:
                state.selected_key = matching_key
                state.selected_table = state.tables[matching_key]
                state.selected_question = state.question_texts[matching_key]
            elif state.analysis_type:
                raise Exception(f"선택된 질문 키 '{state.selected_key}'에 해당하는 테이블이 없습니다.")
            else:
                # 배치 분석의 경우 첫 번째 질문 사용
                state.selected_key = state.question_keys[0]
                state.selected_table = state.tables[state.selected_key]
                state.selected_question = state.question_texts[state.selected_key]
        
        # 테이블 선형화
        if state.selected_table is not None:
            state.linearized_table = self.linearize_row_wise(state.selected_table)
        
        return state
    
    async def hypothesis_generate_node(self, state: AgentState, on_step=None) -> AgentState:
        """가설 생성 노드"""
        if on_step:
            on_step("💡 가설 생성 노드 시작")
        
        prompt = f"""다음 설문 데이터를 분석하여 통계적 가설을 생성해주세요.

질문: {state.selected_question}
데이터: {state.linearized_table}

다음 형식으로 가설을 생성해주세요:
1. 주요 가설 (H1, H2, H3...)
2. 통계 검정 방법 제안
3. 예상 결과

언어: {state.lang}"""

        messages = [
            {"role": "system", "content": "당신은 통계 분석 전문가입니다."},
            {"role": "user", "content": prompt}
        ]
        
        state.generated_hypotheses = await self.make_openai_call(messages)
        return state
    
    def rule_based_test_type_decision(self, columns, question_text=""):
        """
        컬럼명과 질문 텍스트를 기반으로 임의 분석/ft_test/chi_square를 rule 기반으로 판단
        """
        import re

        # 1️⃣ 임의 분석 판단: 복수 응답 또는 순위 응답 패턴 존재 여부
        multi_response_keywords = [
            "1+2", "1+2+3", "복수", "다중", "multiple", "rank", "ranking", "우선순위"
        ]
        text_to_check = (" ".join(columns) + " " + question_text).lower()
        if any(keyword.lower() in text_to_check for keyword in multi_response_keywords):
            return "manual"

        # 2️⃣ ft_test 판단 기준: 전형적인 범주형 표현이 있는 경우
        categorical_patterns = [
            # 관심도 관련
            r"전혀\s*관심", r"관심\s*없(다|는)", r"관심\s*있(다|는)", r"매우\s*관심", r"관심",

            # 만족도 관련
            r"매우\s*만족", r"만족", r"불만족", r"매우\s*불만족", r"보통",

            # 찬반 관련
            r"찬성", r"반대", r"매우\s*찬성", r"매우\s*반대", r"대체로\s*찬성", r"대체로\s*반대",

            # 중요도 관련
            r"매우\s*중요", r"중요", r"그다지\s*중요하지\s*않", r"전혀\s*중요하지\s*않",

            # 심각성 인식
            r"매우\s*심각", r"심각", r"심각하지\s*않", r"전혀\s*심각하지\s*않",

            # 빈도 관련
            r"자주", r"가끔", r"거의\s*없", r"전혀\s*없",

            # 안전성 관련
            r"안전", r"매우\s*안전", r"위험", r"매우\s*위험",

            # 인지/경험 여부
            r"들어본\s*적", r"사용한\s*적", r"경험했", r"인지",

            # 태도/의향 관련
            r"의향", r"생각", r"예정", r"계획", r"할\s*것",

            # 정도 표현
            r"매우", r"약간", r"보통", r"그다지", r"전혀"
        ]
        if any(any(re.search(pattern, col) for pattern in categorical_patterns) for col in columns):
            return "ft_test"

        # 3️⃣ 나머지는 chi_square
        return "chi_square"
    
    async def test_decision_node(self, state: AgentState, on_step=None) -> AgentState:
        """검정 방법 결정 노드"""
        if on_step:
            on_step("🧭 통계 검정 결정 노드 시작")
        if state.selected_table is not None:
            columns = state.selected_table.columns.tolist()
            # 단일 문항 분석이면 LLM, 일괄 분석이면 rule-based
            if getattr(state, 'analysis_type', True):
                # 단일 문항 분석: LLM
                from utils.data_processor import DataProcessor
                data_processor = DataProcessor()
                test_type = await data_processor.llm_test_type_decision(columns, state.selected_question)
            else:
                # 일괄 분석: rule-based
                from utils.data_processor import DataProcessor
                data_processor = DataProcessor()
                test_type = data_processor.rule_based_test_type_decision(columns, state.selected_question)
            state.test_type = test_type
        return state
    
    async def ft_analysis_node(self, state: AgentState, on_step=None) -> AgentState:
        """F/T 분석 노드"""
        if on_step:
            on_step("✅ F/T 분석 노드 시작")
        
        try:
            if state.selected_table is not None:
                # 통계 분석 실행
                result = await self.run_statistical_tests(
                    state.test_type,
                    state.selected_table,
                    state.selected_key
                )
                state.ft_test_result = result
                
                # 결과 요약
                summary = self.summarize_ft_test(result, state.lang)
                state.ft_test_summary = summary
        except Exception as e:
            state.ft_error = str(e)
        
        return state
    
    async def run_statistical_tests(self, test_type: str, df: pd.DataFrame, question_key: str) -> List[Dict[str, Any]]:
        """통계 검정 실행"""
        results = []
        
        try:
            if test_type == "t-test":
                # t-test 실행
                numeric_cols = df.select_dtypes(include=[np.number]).columns
                if len(numeric_cols) >= 2:
                    for i in range(len(numeric_cols)):
                        for j in range(i+1, len(numeric_cols)):
                            col1, col2 = numeric_cols[i], numeric_cols[j]
                            stat, p_value = stats.ttest_ind(df[col1].dropna(), df[col2].dropna())
                            results.append({
                                "test_type": "t-test",
                                "columns": [col1, col2],
                                "statistic": float(stat),
                                "p_value": float(p_value),
                                "significant": p_value < 0.05
                            })
            
            elif test_type == "chi-square":
                # chi-square test 실행
                categorical_cols = df.select_dtypes(include=['object']).columns
                if len(categorical_cols) >= 2:
                    for i in range(len(categorical_cols)):
                        for j in range(i+1, len(categorical_cols)):
                            col1, col2 = categorical_cols[i], categorical_cols[j]
                            contingency_table = pd.crosstab(df[col1], df[col2])
                            chi2, p_value, dof, expected = stats.chi2_contingency(contingency_table)
                            results.append({
                                "test_type": "chi-square",
                                "columns": [col1, col2],
                                "statistic": float(chi2),
                                "p_value": float(p_value),
                                "significant": p_value < 0.05
                            })
            
            else:
                # 기본 기술통계
                numeric_cols = df.select_dtypes(include=[np.number]).columns
                for col in numeric_cols:
                    stats_data = df[col].describe()
                    results.append({
                        "test_type": "descriptive",
                        "column": col,
                        "mean": float(stats_data['mean']),
                        "std": float(stats_data['std']),
                        "min": float(stats_data['min']),
                        "max": float(stats_data['max'])
                    })
        
        except Exception as e:
            results.append({
                "test_type": "error",
                "error": str(e)
            })
        
        return results
    
    def summarize_ft_test(self, results: List[Dict[str, Any]], lang: str = "한국어") -> str:
        """통계 검정 결과 요약"""
        if not results:
            return "통계 분석 결과가 없습니다."
        
        summary_parts = []
        
        for result in results:
            if result.get("test_type") == "t-test":
                col1, col2 = result["columns"]
                p_value = result["p_value"]
                significant = "유의함" if result["significant"] else "유의하지 않음"
                summary_parts.append(f"t-test ({col1} vs {col2}): p={p_value:.4f} ({significant})")
            
            elif result.get("test_type") == "chi-square":
                col1, col2 = result["columns"]
                p_value = result["p_value"]
                significant = "유의함" if result["significant"] else "유의하지 않음"
                summary_parts.append(f"Chi-square ({col1} vs {col2}): p={p_value:.4f} ({significant})")
            
            elif result.get("test_type") == "descriptive":
                col = result["column"]
                mean = result["mean"]
                std = result["std"]
                summary_parts.append(f"{col}: 평균={mean:.2f}, 표준편차={std:.2f}")
        
        return "\n".join(summary_parts)
    
    async def get_anchor_node(self, state: AgentState, on_step=None) -> AgentState:
        """앵커 추출 노드"""
        if on_step:
            on_step("📌 앵커 추출 노드 시작")
        
        prompt = f"""다음 데이터에서 주요 앵커 포인트를 추출해주세요.

데이터: {state.linearized_table}
통계 결과: {state.ft_test_summary}

주요 앵커 포인트를 리스트로 작성해주세요."""

        messages = [
            {"role": "system", "content": "당신은 데이터 분석 전문가입니다."},
            {"role": "user", "content": prompt}
        ]
        
        anchor_response = await self.make_openai_call(messages)
        state.anchor = [line.strip() for line in anchor_response.split('\n') if line.strip()]
        
        return state
    
    async def table_analyzer(self, state: AgentState, on_step=None) -> AgentState:
        """테이블 분석 노드"""
        if on_step:
            on_step("🤖 테이블 분석 노드 시작")
        
        prompt = f"""다음 데이터를 종합적으로 분석해주세요.

질문: {state.selected_question}
데이터: {state.linearized_table}
통계 결과: {state.ft_test_summary}
앵커 포인트: {', '.join(state.anchor)}

다음 형식으로 분석해주세요:
1. 데이터 개요
2. 주요 발견사항
3. 통계적 의미
4. 실무적 함의

언어: {state.lang}"""

        messages = [
            {"role": "system", "content": "당신은 데이터 분석 전문가입니다."},
            {"role": "user", "content": prompt}
        ]
        
        state.table_analysis = await self.make_openai_call(messages)
        return state
    
    async def hallucination_check_node(self, state: AgentState, on_step=None) -> AgentState:
        """환각 검증 노드"""
        if on_step:
            on_step("🧠 환각 평가 노드 시작")
        
        prompt = f"""다음 분석 결과가 데이터에 근거한 것인지 검증해주세요.

원본 데이터: {state.linearized_table}
분석 결과: {state.table_analysis}

다음 중 하나로 답해주세요:
- accept: 데이터에 근거한 분석
- reject: 데이터에 근거하지 않은 분석

이유도 함께 설명해주세요."""

        messages = [
            {"role": "system", "content": "당신은 데이터 검증 전문가입니다."},
            {"role": "user", "content": prompt}
        ]
        
        check_response = await self.make_openai_call(messages)
        
        if "accept" in check_response.lower():
            state.hallucination_check = "accept"
        elif "reject" in check_response.lower():
            state.hallucination_check = "reject"
        else:
            state.hallucination_check = "reject"  # 기본값
        
        state.feedback = check_response
        return state
    
    async def revise_table_analysis(self, state: AgentState, on_step=None) -> AgentState:
        """분석 수정 노드"""
        if on_step:
            on_step("✏️ 분석 수정 노드 시작")
        
        # 이전 분석을 히스토리에 저장
        if state.table_analysis:
            if not state.revised_analysis_history:
                state.revised_analysis_history = []
            state.revised_analysis_history.append(state.table_analysis)
        
        prompt = f"""이전 분석이 거부되었습니다. 데이터에 더 근거한 분석을 작성해주세요.

원본 데이터: {state.linearized_table}
통계 결과: {state.ft_test_summary}
피드백: {state.feedback}

데이터에 엄격히 근거하여 다시 분석해주세요."""

        messages = [
            {"role": "system", "content": "당신은 데이터 분석 전문가입니다. 데이터에 엄격히 근거하여 분석하세요."},
            {"role": "user", "content": prompt}
        ]
        
        state.revised_analysis = await self.make_openai_call(messages)
        state.table_analysis = state.revised_analysis
        
        return state
    
    async def sentence_polish_node(self, state: AgentState, on_step=None) -> AgentState:
        """문장 다듬기 노드"""
        if on_step:
            on_step("💅 문장 다듬기 노드 시작")
        
        prompt = f"""다음 분석 결과를 더 명확하고 읽기 쉽게 다듬어주세요.

분석 결과: {state.table_analysis}

다음 요구사항을 만족하도록 수정해주세요:
1. 명확하고 간결한 문장
2. 논리적 구조
3. 실무자가 이해하기 쉬운 표현
4. 구체적인 수치와 근거 포함

언어: {state.lang}"""

        messages = [
            {"role": "system", "content": "당신은 문서 작성 전문가입니다."},
            {"role": "user", "content": prompt}
        ]
        
        state.polishing_result = await self.make_openai_call(messages)
        return state
    
    async def execute(self, file_content: bytes, file_name: str, options: Dict[str, Any] = None) -> Dict[str, Any]:
        """워크플로우 실행"""
        try:
            # 초기 상태 설정
            state = AgentState(
                uploaded_file=file_content,
                file_path=file_name,
                analysis_type=options.get("analysis_type", True) if options else True,
                selected_key=options.get("selected_key", "") if options else "",
                lang=options.get("lang", "한국어") if options else "한국어",
                user_id=options.get("user_id") if options else None
            )
            
            on_step = options.get("on_step") if options else None
            
            # 워크플로우 실행
            state = await self.table_parser_node(state, on_step)
            state = await self.hypothesis_generate_node(state, on_step)
            state = await self.test_decision_node(state, on_step)
            state = await self.ft_analysis_node(state, on_step)
            state = await self.get_anchor_node(state, on_step)
            state = await self.table_analyzer(state, on_step)
            
            # 환각 검증 및 수정 루프
            max_revisions = 4
            while state.hallucination_reject_num < max_revisions:
                state = await self.hallucination_check_node(state, on_step)
                if state.hallucination_check == "accept":
                    break
                elif state.hallucination_check == "reject":
                    if state.hallucination_reject_num >= 4:
                        if on_step:
                            on_step("⚠️ 거부 횟수 초과, 종료합니다.")
                        break
                    state = await self.revise_table_analysis(state, on_step)
                    state.hallucination_reject_num += 1
                else:
                    raise Exception(f"예상치 못한 결정: {state.hallucination_check}")
            
            state = await self.sentence_polish_node(state, on_step)
            
            return {
                "success": True,
                "result": {
                    "polishing_result": state.polishing_result,
                    "table_analysis": state.table_analysis,
                    "ft_test_summary": state.ft_test_summary,
                    "generated_hypotheses": state.generated_hypotheses,
                    "anchor": state.anchor,
                    "revised_analysis_history": state.revised_analysis_history
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            } 