from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from app.single_analysis.domain.entities import AgentState
from app.single_analysis.infra.openai_client import OpenAIClient
from app.single_analysis.infra.excel_loader import ExcelLoader
from app.single_analysis.infra.statistical_test import StatisticalTester
import re


class TableAnalysisService:
    """테이블 분석 비즈니스 로직 서비스"""
    
    def __init__(self, openai_client: OpenAIClient, excel_loader: ExcelLoader, statistical_tester: StatisticalTester):
        self.openai_client = openai_client
        self.excel_loader = excel_loader
        self.statistical_tester = statistical_tester
    
    async def parse_table(self, state: AgentState, on_step=None) -> AgentState:
        """테이블 파서 노드""" 
        if on_step:
            on_step("📊 테이블 파서 노드 시작")
        
        # 파일에서 테이블 파싱
        if state.uploaded_file:
            parsed_data = self.excel_loader.load_survey_tables(
                state.uploaded_file,
                state.file_path
            )
            state.tables = parsed_data["tables"]
            state.question_texts = parsed_data["question_texts"]
            state.question_keys = parsed_data["question_keys"]
        
        # 선택된 키 매칭
        if state.selected_key and state.tables:
            matching_key = self.excel_loader.find_matching_key(state.selected_key, list(state.tables.keys()))
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
    
    async def generate_hypothesis(self, state: AgentState, on_step=None) -> AgentState:
        """가설 생성 노드"""
        if on_step:
            on_step("💡 가설 생성 노드 시작")

        selected_table = state.selected_table
        selected_question = state.selected_question
        lang = state.lang if hasattr(state, 'lang') else "한국어"

        # row와 column name 추출
        if selected_table is not None and isinstance(selected_table, pd.DataFrame):
            if "대분류" in selected_table.columns and "소분류" in selected_table.columns:
                selected_table = selected_table.copy()
                selected_table["row_name"] = selected_table["대분류"].astype(str) + "_" + selected_table["소분류"].astype(str)
                row_names = selected_table["row_name"].dropna().tolist()
            else:
                row_names = list(selected_table.index)
            column_names = list(selected_table.columns)
        else:
            row_names = []
            column_names = []

        row_names_str = ", ".join(map(str, row_names))
        column_names_str = ", ".join(map(str, column_names))

        # 프롬프트 정의
        HYPOTHESIS_PROMPT = {
            "한국어": """
        당신은 통계 데이터를 해석하는 데이터 과학자입니다.
        아래는 분석할 표의 row명 (index)과 column명입니다.

        row: {row_names}
        column: {column_names}

        당신의 임무는, 사용자의 질문 ("{selected_question}")과 관련해  
        데이터에서 확인할 수 있을 법한 가설(패턴, 관계)을 2~5개 정도 제안하는 것입니다.

        예시:
        1. 연령대가 높을수록 관심도가 높을 것이다.
        2. 기저질환이 있는 경우 관심도가 높을 것이다.

        - 데이터 기반으로 합리적인 가설만 생성할 것
        - 외부 지식은 절대 사용 금지
        - 문장 길이는 짧고, 번호 리스트로 작성
        """,
            "English": """
        You are a data scientist interpreting statistical tables.
        Below are the row names (index) and column names of the table to be analyzed.

        row: {row_names}
        column: {column_names}

        Your task is to propose 2 to 5 hypotheses (patterns or relationships) relevant to the user's question ("{selected_question}") that could be inferred from the data.

        Example:
        1. Older age groups may show higher interest.
        2. Those with chronic illnesses may show higher concern.

        - Only propose reasonable hypotheses based on the data
        - Do not use external knowledge
        - Keep sentences short and format as a numbered list
        """
        }

        prompt = HYPOTHESIS_PROMPT[lang].format(
            row_names=row_names_str,
            column_names=column_names_str,
            selected_question=selected_question
        )

        messages = [
            {"role": "system", "content": "당신은 통계 분석 전문가입니다." if lang == "한국어" else "You are a statistical analysis expert."},
            {"role": "user", "content": prompt}
        ]

        state.generated_hypotheses = await self.openai_client.call(messages)
        return state
    
    async def decide_test_type(self, state: AgentState, on_step=None) -> AgentState:
        """통계 검정 방법 LLM 단일 분류 노드 (manual/ft_test/chi_square)"""
        if on_step:
            on_step("🧭 통계 검정 결정 노드 시작")
        
        use_statistical_test = getattr(state, 'use_statistical_test', True)
        
        # 통계 검정 미사용 시 자동으로 manual로 설정
        if not use_statistical_test:
            print("[decide_test_type] 통계 검정 미사용 - 자동으로 manual로 설정")
            state.test_type = "manual"
            return state
        
        # 통계 검정 사용 시: 기존 LLM 로직
        if state.selected_table is not None:
            columns = state.selected_table.columns.tolist()
            question_text = getattr(state, 'selected_question', "")
            column_names_str = ", ".join(columns)
            TEST_TYPE_PROMPT = """
당신은 통계 전문가입니다.

아래는 설문 문항과 열 이름 목록입니다.

문항: {question_text}
열 이름: {column_names}

당신의 임무는, 이 문항이 아래 중 어떤 통계 분석 유형에 해당하는지 분류하는 것입니다.

📋 분류 기준:

1️⃣ **manual** (복수응답/다중응답/순위형):
    - 한 응답자가 여러 항목을 선택하거나, 여러 순위를 동시에 응답하는 경우
        - !!!주의!!! 문항에 "1순위"만 있는 경우는 manual이 아님 (ft_test와 chi_square 중 하나로 결정)
    - 예시: "복수응답", "다중응답", "1+2순위", "1+2+3순위", "ranking", "우선순위(1+2)", "다중선택", "모두선택"
    - 문항에 "복수", "다중", "multiple", "ranking" 등이 포함된 경우

2️⃣ **ft_test** (연속형 수치 응답):
    - 문항이 1~5점 척도, 평균, 비율, 점수 등 숫자 기반으로 요약되어 있는 경우
    - 예시 열 이름: "평균", "만족도 점수", "~% 비율", "5점 척도", "평균 점수", "관심도 평균"
    - "전혀 관심이 없다", "매우 관심 있다" 등은 실제로는 선택지이지만, 빈도나 비율로 수치화되었을 경우 → 연속형으로 판단
    - 테이블이 전체적으로 평균값 또는 %비율 중심이면 ft_test 선택이 더 적절

3️⃣ **chi_square** (범주형 선택 응답):
    - 문항이 응답자들이 특정 항목을 **선택**하거나 **다중선택**한 결과일 경우
    - 예시 열 이름: "주요 이용시설", "선택 이유", "가장 많이 선택한 장소", "다중 응답"
    - 단일 선택 문항 (한 명이 한 항목만 선택하는 경우)

❗ **오판 주의사항**:
- 응답 선택지 이름(예: "전혀 관심 없다", "매우 관심 있다")가 열 이름에 포함되더라도, **비율, 평균 등의 수치형 요약**이면 `ft_test`로 간주
- 테이블이 전체적으로 평균값 또는 %비율 중심이면 `ft_test` 선택이 더 적절
- 문항에 "1순위"만 있는 경우는 복수응답이 아니기 때문에 manual이 아님 (ft_test와 chi_square 중 하나로 결정)
- "1+2순위", "1+2+3순위" 등 복수 순위만 복수응답으로 manual로 분류

---

아래 중 하나로만 답변하세요(설명 없이):
- manual
- ft_test  
- chi_square
"""
            prompt = TEST_TYPE_PROMPT.format(
                question_text=question_text,
                column_names=column_names_str
            )
            messages = [
                {"role": "system", "content": "당신은 통계 전문가입니다."},
                {"role": "user", "content": prompt}
            ]
            llm_result = await self.openai_client.call(messages)
            llm_output = llm_result.strip().lower()
            if "manual" in llm_output:
                state.test_type = "manual"
            elif "chi" in llm_output:
                state.test_type = "chi_square"
            elif "ft" in llm_output:
                state.test_type = "ft_test"
            else:
                state.test_type = "unknown"
        return state
    
    async def run_statistical_analysis(self, state: AgentState, on_step=None) -> AgentState:
        """통계 분석 실행 노드"""
        if on_step:
            on_step("✅ F/T 분석 노드 시작")
        try:
            from io import BytesIO
            use_statistical_test = getattr(state, 'use_statistical_test', True)
            
            if use_statistical_test and hasattr(state, 'raw_data_file') and state.raw_data_file is not None:
                # 통계 검정 사용 시: Raw Data를 사용한 통계 분석
                print("[ft_analysis_node] raw_data_file exists - 통계 검정 사용")
                raw_data_file = BytesIO(state.raw_data_file) if isinstance(state.raw_data_file, (bytes, bytearray)) else state.raw_data_file
                raw_data = pd.read_excel(raw_data_file, sheet_name="DATA")
                demo_df = pd.read_excel(raw_data_file, sheet_name="DEMO")
                print(f"[ft_analysis_node] raw_data.columns: {raw_data.columns.tolist()}")
                print(f"[ft_analysis_node] demo_df.columns: {demo_df.columns.tolist()}")
                raw_data.columns = [col.replace("-", "_").strip() for col in raw_data.columns]
                demo_mapping = self.statistical_tester.extract_demo_mapping_from_dataframe(demo_df)
                print(f"[ft_analysis_node] demo_mapping: {demo_mapping}")
                test_type = getattr(state, 'test_type', None)
                question_key = getattr(state, 'selected_key', None)
                lang = getattr(state, 'lang', "한국어")
                print(f"[ft_analysis_node] test_type: {test_type}, question_key: {question_key}, lang: {lang}")
                if not isinstance(test_type, str) or not test_type:
                    raise ValueError("test_type이 올바르지 않습니다.")
                if not isinstance(question_key, str) or not question_key:
                    raise ValueError("question_key가 올바르지 않습니다.")
                result_df = self.statistical_tester.run_statistical_tests(test_type, raw_data, question_key, demo_mapping)
                print(f"[ft_analysis_node] result_df shape: {result_df.shape}")
                print(f"[ft_analysis_node] result_df: {result_df}")
                # Ensure result_df is always a DataFrame
                if not isinstance(result_df, pd.DataFrame):
                    print(f"[ft_analysis_node] result_df is not DataFrame, converting to empty DataFrame")
                    result_df = pd.DataFrame([])
                summary_text = self.statistical_tester.summarize_ft_test(result_df, lang=lang)
                state.raw_data = raw_data
                state.ft_test_result = result_df
                state.ft_test_summary = summary_text
            else:
                # 통계 검정 미사용 시: 통계표만을 사용한 manual 통계 분석
                print("[ft_analysis_node] 통계 검정 미사용 - 통계표만으로 manual 분석")
                selected_table = getattr(state, 'selected_table', None)
                if selected_table is not None and isinstance(selected_table, pd.DataFrame):
                    # 통계표에서 manual 방식으로 유의성 있는 대분류 추출
                    result_df = self.run_manual_analysis_from_table(selected_table)
                    summary_text = self.summarize_manual_analysis(result_df, lang=getattr(state, 'lang', "한국어"))
                    state.ft_test_result = result_df
                    state.ft_test_summary = summary_text
                else:
                    print("[ft_analysis_node] selected_table이 없습니다.")
                    state.ft_error = "분석할 테이블이 없습니다."
                    state.ft_test_result = pd.DataFrame([])
                    state.ft_test_summary = "통계 분석 결과가 없습니다."
        except Exception as e:
            print(f"[ft_analysis_node] Exception: {e}")
            state.ft_error = str(e)
            # Set empty DataFrame on error
            state.ft_test_result = pd.DataFrame([])
            state.ft_test_summary = "통계 분석 중 오류가 발생했습니다."
        return state
    
    async def extract_anchor(self, state: AgentState, on_step=None) -> AgentState:
        """앵커 추출 노드"""
        if on_step:
            on_step("📌 앵커 추출 노드 시작")
        
        selected_table = getattr(state, 'selected_table', None)
        lang = getattr(state, 'lang', '한국어')
        anchor = []
        
        if selected_table is not None and isinstance(selected_table, pd.DataFrame):
            exclude_cols = set([
                "대분류", "소분류", "사례수",
                "대분류_소분류"
            ])
            
            def is_anchor_candidate(col):
                col_str = str(col).strip()
                if col_str in exclude_cols:
                    return False
                # %로 끝나는 컬럼 제외 (공백 포함)
                if col_str.rstrip().endswith('%'):
                    return False
                # 평균, 합계, std, score 등 포함시 제외
                if any(keyword in col_str for keyword in ['평균', '합계', 'std', 'score']):
                    return False
                return True
            
            # "전 체" 또는 "전체" row 찾기 (공백 제거)
            total_row = selected_table[selected_table["대분류"].astype(str).str.strip().str.replace(" ", "") == "전체"]
            if total_row.empty:
                state.anchor = []
                state.ft_error = "❌ '전 체' 또는 '전체'에 해당하는 행이 존재하지 않습니다."
                return state
            
            total_row = total_row.iloc[0]
            candidate_cols = [col for col in selected_table.columns if is_anchor_candidate(col)]
            values = total_row[candidate_cols]
            values_numeric = pd.to_numeric(values, errors='coerce')
            high_value_cols = values_numeric.dropna().sort_values(ascending=False)
            cumulative_sum = 0
            selected_cols = []
            for col, val in high_value_cols.items():
                cumulative_sum += val
                selected_cols.append(col)
                if cumulative_sum >= 60:
                    break
            anchor = selected_cols
        
        state.anchor = anchor
        return state
    
    async def analyze_table(self, state: AgentState, on_step=None) -> AgentState:
        """테이블 분석 노드"""
        if on_step:
            on_step("🤖 테이블 분석 노드 시작")
        
        lang = getattr(state, 'lang', '한국어')
        linearized_table = getattr(state, 'linearized_table', '')
        ft_test_summary = getattr(state, 'ft_test_summary', '')
        selected_question = getattr(state, 'selected_question', '')
        anchor = getattr(state, 'anchor', '없음')
        
        prompt = self.TABLE_ANALYSIS_PROMPT[lang].format(
            selected_question=selected_question,
            linearized_table=linearized_table,
            ft_test_summary=str(ft_test_summary),
            anchor=anchor
        )
        
        messages = [
            {"role": "system", "content": "당신은 통계 분석 전문가입니다." if lang == "한국어" else "You are a statistical analysis expert."},
            {"role": "user", "content": prompt}
        ]
        
        state.table_analysis = await self.openai_client.call(messages)
        return state
    
    async def check_hallucination(self, state: AgentState, on_step=None) -> AgentState:
        """환각 검증 노드"""
        if on_step:
            on_step("🧠 환각 평가 노드 시작")
        
        lang = getattr(state, 'lang', '한국어')
        hallucination_reject_num = getattr(state, 'hallucination_reject_num', 0)
        
        # 수정 이력이 있으면 마지막 수정본 사용
        if hasattr(state, 'revised_analysis_history') and state.revised_analysis_history:
            table_analysis = state.revised_analysis_history[-1]
        else:
            table_analysis = getattr(state, 'table_analysis', '')
        
        prompt = self.HALLUCINATION_CHECK_PROMPT[lang].format(
            selected_question=getattr(state, 'selected_question', ''),
            linearized_table=getattr(state, 'linearized_table', ''),
            ft_test_summary=str(getattr(state, 'ft_test_summary', '')),
            table_analysis=table_analysis
        )
        
        messages = [
            {"role": "system", "content": "당신은 통계 해석 결과를 검증하는 전문가입니다." if lang == "한국어" else "You are a statistical analysis auditor."},
            {"role": "user", "content": prompt}
        ]
        
        result = await self.openai_client.call(messages)
        result_str = result.strip() if hasattr(result, 'strip') else str(result)
        
        if result_str.lower().startswith("reject"):
            decision = "reject"
            feedback = result_str[len("reject"):].strip(": ").strip()
            hallucination_reject_num += 1
            if hasattr(state, 'revised_analysis_history'):
                state.revised_analysis_history.append(table_analysis)
            else:
                state.revised_analysis_history = [table_analysis]
        else:
            decision = "accept"
            feedback = ""
        
        state.hallucination_check = decision
        state.feedback = feedback
        state.hallucination_reject_num = hallucination_reject_num
        return state
    
    async def revise_analysis(self, state: AgentState, on_step=None) -> AgentState:
        """분석 수정 노드"""
        if on_step:
            on_step("✏️ 분석 수정 노드 시작")
        
        lang = getattr(state, 'lang', '한국어')
        
        # report_to_modify는 revised_history가 있으면 마지막 것을, 없으면 초안을 fallback
        report_to_modify = state.revised_analysis_history[-1] if getattr(state, 'revised_analysis_history', None) else getattr(state, 'table_analysis', '')
        
        prompt = self.REVISION_PROMPT[lang].format(
            linearized_table=getattr(state, 'linearized_table', ''),
            ft_test_summary=str(getattr(state, 'ft_test_summary', '')),
            anchor=getattr(state, 'anchor', ''),
            report_to_modify=report_to_modify,
            feedback=getattr(state, 'feedback', '')
        )
        
        messages = [
            {"role": "system", "content": "당신은 통계 데이터를 바탕으로 인구집단 간 패턴과 경향성을 객관적으로 요약하는 데이터 분석 전문가입니다." if lang == "한국어" else "You are a data analyst who objectively summarizes population-level patterns based on statistical data."},
            {"role": "user", "content": prompt}
        ]
        
        result = await self.openai_client.call(messages)
        new_revised_analysis = result.strip() if hasattr(result, 'strip') else str(result)
        
        # Append to revision history
        if hasattr(state, 'revised_analysis_history') and state.revised_analysis_history:
            revision_history = state.revised_analysis_history
        else:
            revision_history = []
        revision_history.append(new_revised_analysis)
        state.revised_analysis = new_revised_analysis
        state.revised_analysis_history = revision_history
        return state
    
    async def polish_sentence(self, state: AgentState, on_step=None) -> AgentState:
        """문장 다듬기 노드"""
        if on_step:
            on_step("💅 문장 다듬기 노드 시작")
        
        lang = getattr(state, 'lang', '한국어')
        hallucination_reject_num = getattr(state, 'hallucination_reject_num', 0)
        raw_summary = state.revised_analysis if hallucination_reject_num > 0 else state.table_analysis
        
        prompt = self.POLISHING_PROMPT[lang].format(raw_summary=raw_summary)
        
        messages = [
            {"role": "system", "content": "당신은 통계 데이터를 바탕으로 작성된 한국어 보고서를 다듬는 문체 전문 에디터입니다." if lang == "한국어" else "You are a stylistic editor for statistical summaries written in Korean."},
            {"role": "user", "content": prompt}
        ]
        
        result = await self.openai_client.call(messages)
        polishing_result = result.strip() if hasattr(result, 'strip') else str(result)
        state.polishing_result = polishing_result
        return state 

    async def decide_batch_test_types(self, question_infos: list, lang: str = "한국어") -> dict:
        """배치 분석용: 여러 질문에 대해 통계 검정 방법을 일괄 결정"""
        try:
            # 1. manual 판정 (복수응답/순위/다중 등 키워드)
            manual_keys = set()
            non_manual_questions = []
            for q in question_infos:
                key, text, columns = q['key'], q['text'], q['columns']
                if self.rule_based_test_type_decision(text) == 'manual':
                    manual_keys.add(key)
                else:
                    non_manual_questions.append(q)
            
            # 2. LLM 프롬프트 생성 (복수응답 아닌 질문들)
            prompt_lines = []
            for q in non_manual_questions:
                col_str = ', '.join(q['columns'])
                prompt_lines.append(f"{q['key']}: {col_str}")
            prompt_body = '\n'.join(prompt_lines)
            
            if lang == "한국어":
                prompt = f"""
                아래는 설문 통계표의 각 질문별 열 이름 목록입니다.
                
                당신의 임무는 각 질문에 대해 **가장 적합한 통계 검정 방법**(ft_test 또는 chi_square)을 결정하는 것입니다.
                
                - ft_test: 평균, 점수, 비율 등 연속형(수치형) 데이터에 적합
                - chi_square: 항목 선택, 다중응답 등 범주형(선택형) 데이터에 적합
                
                아래 기준을 참고하세요:
                - 열 이름에 '평균', '점수', '%', '비율' 등이 포함되어 있으면 ft_test
                - 항목 선택, 다중응답, 범주형 선택지면 chi_square
                
                아래와 같은 형식으로만 답변하세요(설명 없이):
                
                예시:
                Q1: ft_test
                Q2: chi_square
                Q3: ft_test
                
                질문별 열 목록:
                {prompt_body}
                
                답변 형식:
                Q1: ft_test
                Q2: chi_square
                ...
                """
            else:
                prompt = f"""
                Below are the column headers for each survey question.
            
                Your task is to determine the **most appropriate statistical test type** (ft_test or chi_square) for each question.
                
                - ft_test: Use for continuous/numeric data (mean, score, %, ratio, etc.)
                - chi_square: Use for categorical/choice/multiple response data
                
                Guidelines:
                - If column names include 'mean', 'score', '%', 'ratio', etc. → ft_test
                - If the question is about selecting items, multiple responses, or categorical choices → chi_square
                - If the question is multiple response/ranking, use 'manual' (already auto-classified)
                
                Please answer in the following format (no explanation):
                
                Example:
                Q1: ft_test
                Q2: chi_square
                Q3: ft_test
                
                Question columns:
                {prompt_body}
                
                Answer format:
                Q1: ft_test
                Q2: chi_square
                ...
                """
            
            # 3. LLM 호출 (없으면 모두 ft_test)
            llm_result = None
            if non_manual_questions:
                messages = [
                    {"role": "system", "content": "당신은 통계 전문가입니다." if lang == "한국어" else "You are a statistics expert."},
                    {"role": "user", "content": prompt}
                ]
                try:
                    llm_result = await self.openai_client.call(messages)
                except Exception as e:
                    print(f"[decide_batch_test_types] LLM 호출 실패: {e}")
                    # fallback: 모두 ft_test
                    llm_result = '\n'.join([f"{q['key']}: ft_test" for q in non_manual_questions])
            
            # 4. LLM 응답 파싱
            test_type_map = {key: 'manual' for key in manual_keys}
            if llm_result:
                import re
                for line in llm_result.splitlines():
                    m = re.match(r"([\w\-]+):\s*(ft_test|chi_square)", line.strip(), re.I)
                    if m:
                        key, ttype = m.group(1), m.group(2).lower()
                        test_type_map[key] = ttype
            
            # 5. 누락된 질문은 기본값(ft_test)
            for q in question_infos:
                if q['key'] not in test_type_map:
                    test_type_map[q['key']] = 'ft_test'
            
            return test_type_map
        except Exception as e:
            print(f"[decide_batch_test_types] 오류: {e}")
            # fallback: 모든 질문을 ft_test로 설정
            return {q["key"]: "ft_test" for q in question_infos}

    def rule_based_test_type_decision(self, question_text=""):
        """질문 텍스트에 복수응답/순위/다중 등 키워드가 있으면 manual, 아니면 None"""
        multi_response_keywords = [
            "1+2", "1+2+3", "복수", "다중", "multiple", "rank", "ranking", "우선순위", "복수응답", "순위"
        ]
        text_to_check = question_text.lower()
        if any(keyword.lower() in text_to_check for keyword in multi_response_keywords):
            return "manual"
        return None

    def run_manual_analysis_from_table(self, table: pd.DataFrame) -> pd.DataFrame:
        """통계표만을 사용하여 manual 방식으로 유의성 있는 대분류 추출 (신뢰구간 기반)"""
        try:
            if table is None or table.empty:
                return pd.DataFrame([])
            
            # "대분류" 컬럼이 있는지 확인
            if "대분류" not in table.columns:
                return pd.DataFrame([])
            
            # "전체" 행 찾기
            overall_row = table[table["대분류"].astype(str).str.strip().str.replace(" ", "") == "전체"]
            if overall_row.empty:
                print("[run_manual_analysis_from_table] '전체' 행이 없습니다.")
                return pd.DataFrame([])
            overall_n = overall_row["사례수"]
            
            # 숫자 컬럼만 선택 (대분류, 소분류, 사례수 제외)
            exclude_cols = ["대분류", "소분류", "사례수"]
            numeric_cols = []
            
            for col in table.columns:
                if col in exclude_cols:
                    continue
                try:
                    # 컬럼이 문자열인지 확인
                    if table[col].dtype == 'object':
                        # 문자열을 숫자로 변환 시도
                        numeric_data = pd.to_numeric(table[col], errors='coerce')
                        # NaN이 아닌 값이 있으면 숫자 컬럼으로 간주
                        if not numeric_data.isna().all():
                            numeric_cols.append(col)
                    else:
                        # 이미 숫자 타입이면 추가
                        numeric_cols.append(col)
                except Exception as e:
                    print(f"[run_manual_analysis_from_table] 컬럼 {col} 검사 중 오류: {e}")
                    continue
            
            if not numeric_cols:
                print("[run_manual_analysis_from_table] 숫자 컬럼이 없습니다.")
                return pd.DataFrame([])
            
            print(f"[run_manual_analysis_from_table] 분석할 숫자 컬럼: {numeric_cols}")
            
            results = []
            for col in numeric_cols:
                try:
                    # 숫자로 변환
                    if table[col].dtype == 'object':
                        numeric_data = pd.to_numeric(table[col], errors='coerce')
                    else:
                        numeric_data = table[col]
                    
                    # 전체 기준값 계산
                    overall_mask = table["대분류"].astype(str).str.strip().str.replace(" ", "") == "전체"
                    overall_values = numeric_data[overall_mask]
                    
                    if overall_values.empty or overall_values.isna().all():
                        print(f"[run_manual_analysis_from_table] 컬럼 {col}의 전체 값이 없습니다.")
                        continue
                    
                    overall_value = overall_values.iloc[0]
                    if pd.isna(overall_value):
                        continue
                    
                    # 사례수 계산 (기본값 100)
                    if "사례수" in table.columns:
                        try:
                            if table["사례수"].dtype == 'object':
                                case_data = pd.to_numeric(table["사례수"], errors='coerce')
                            else:
                                case_data = table["사례수"]
                            overall_n = case_data[overall_mask].iloc[0]
                            if pd.isna(overall_n) or overall_n <= 0:
                                overall_n = 100
                        except Exception as e:
                            print(f"[run_manual_analysis_from_table] 사례수 계산 오류: {e}")
                            overall_n = 100
                    
                    # 표준오차 계산
                    overall_std = numeric_data.std()
                    if overall_std == 0 or pd.isna(overall_std):
                        continue
                    
                    std_error = overall_std / np.sqrt(overall_n)
                    z_score = 1.96
                    ci_lower = overall_value - z_score * std_error
                    ci_upper = overall_value + z_score * std_error
                    
                    # 각 대분류별 분석
                    for idx, row in table.iterrows():
                        if str(row["대분류"]).strip().replace(" ", "") == "전체":
                            continue
                        
                        group_value = numeric_data.iloc[idx]
                        if pd.isna(group_value):
                            continue
                        
                        # 그룹 라벨 생성
                        if "소분류" in table.columns and pd.notna(row['소분류']):
                            group_label = f"{row['대분류']} - {row['소분류']}"
                        else:
                            group_label = row['대분류']
                        
                        # 신뢰구간 기반 유의성 판단
                        significant = group_value < ci_lower or group_value > ci_upper
                        
                        results.append({
                            "대분류": group_label,
                            "평균값": round(group_value, 3),
                            "유의미 여부": "유의미함" if significant else "무의미함",
                            "기준 평균": round(overall_value, 3),
                            "신뢰구간": f"{round(ci_lower, 1)} ~ {round(ci_upper, 1)}",
                            "유의성": "*" if significant else ""
                        })
                        
                except Exception as e:
                    print(f"[run_manual_analysis_from_table] 컬럼 {col} 분석 중 오류: {e}")
                    continue
            
            return pd.DataFrame(results)
            
        except Exception as e:
            print(f"[run_manual_analysis_from_table] 오류: {e}")
            return pd.DataFrame([])

    def summarize_manual_analysis(self, result_df: pd.DataFrame, lang: str = "한국어") -> str:
        """
        Manual 분석 결과를 자연어로 요약
        - 유의성(별표)이 있는 항목만 추림
        - 모두 유의하면 전체 유의, 일부만 유의하면 해당 그룹 나열
        - 유의한 항목이 없으면 평균 차이 상위 3개 언급
        """
        if result_df is None or result_df.empty:
            return "분석 결과가 없습니다." if lang == "한국어" else "No analysis result."
        significant = result_df[result_df["유의성"] != ""]
        summary = []
        if not significant.empty:
            sig_items = significant["대분류"].tolist()
            if len(sig_items) == len(result_df):
                summary.append(
                    "모든 항목에서 전체 평균과 유의미한 차이가 관찰되었음. 대분류 전반에 걸쳐 의미 있는 차이가 존재함."
                    if lang == "한국어" else
                    "All categories showed significant differences from the overall mean. Broad variation was observed across major groups."
                )
            else:
                summary.append(
                    f"{', '.join(sig_items)}는 전체 평균과 유의미한 차이를 보였음."
                    if lang == "한국어" else
                    f"{', '.join(sig_items)} showed significant differences from the overall mean."
                )
        else:
            # 유의한 항목이 전혀 없을 경우 → 평균 차이 상위 3개 언급
            if not result_df.empty and "평균값" in result_df.columns and "기준 평균" in result_df.columns:
                result_df["평균차이"] = (result_df["평균값"] - result_df["기준 평균"]).abs()
                top3 = result_df.nlargest(3, "평균차이")[["대분류", "평균값", "기준 평균"]]
                top3_text = ", ".join(f"{row['대분류']} (평균: {row['평균값']}, 전체: {row['기준 평균']})" for _, row in top3.iterrows())
                summary.append(
                    f"유의미한 차이는 없었지만, 평균 차이가 큰 항목은 {top3_text} 순이었음."
                    if lang == "한국어" else
                    f"No significant differences, but the largest mean differences were: {top3_text}."
                )
            else:
                summary.append("유의미한 차이가 없습니다." if lang == "한국어" else "No significant differences.")
        return "  ".join(summary)

    def summarize_ft_test(self, result_df, lang: str = "한국어") -> str:
        """
        ft_test/chi_square 결과를 자연어로 요약
        - 유의성(별표)이 있는 항목만 추림
        - 모두 유의하면 전체 유의, 일부만 유의하면 해당 그룹 나열
        - 유의한 항목이 없으면 p-value 상위 3개 언급
        """
        if result_df is None or result_df.empty:
            return "분석 결과가 없습니다." if lang == "한국어" else "No analysis result."
        significant = result_df[result_df["유의성"] != ""]
        summary = []
        if not significant.empty:
            sig_items = significant["대분류"].tolist()
            if len(sig_items) == len(result_df):
                summary.append(
                    "모든 항목에서 통계적으로 유의미한 차이가 관찰되었음. 대분류 전반에 걸쳐 의미 있는 차이가 존재함."
                    if lang == "한국어" else
                    "All categories showed statistically significant differences. Broad variation was observed across major groups."
                )
            else:
                summary.append(
                    f"{', '.join(sig_items)}는 통계적으로 유의한 차이를 보였음."
                    if lang == "한국어" else
                    f"{', '.join(sig_items)} showed statistically significant differences."
                )
        else:
            # 유의한 항목이 전혀 없을 경우 → p-value 기준 상위 3개 언급
            if not result_df.empty and "p-value" in result_df.columns:
                top3 = result_df.nsmallest(3, "p-value")[["대분류", "p-value"]]
                top3_text = ", ".join(f"{row['대분류']} (p={row['p-value']:.3f})" for _, row in top3.iterrows())
                summary.append(
                    f"통계적으로 유의한 항목은 없었지만, 상대적으로 p-value가 낮은 항목은 {top3_text} 순이었음."
                    if lang == "한국어" else
                    f"No items reached statistical significance, but the ones with the lowest p-values were: {top3_text}."
                )
            else:
                summary.append("통계적으로 유의한 항목이 없습니다." if lang == "한국어" else "No statistically significant items.")
        return "  ".join(summary)

    # --- PROMPT DEFINITIONS ---
    TABLE_ANALYSIS_PROMPT = {
        "한국어": """
        당신은 통계 데이터를 바탕으로 인구집단 간 경향을 요약하는 데이터 분석 전문가입니다.
        특히 아래 두 가지 정보를 종합적으로 활용해 핵심적 경향을 도출해야 합니다:

        1️⃣ **통계 분석 결과(ft_test_summary)**: 어떤 대분류(row)가 통계적으로 유의미한 차이를 보였는지 알려줍니다.
        2️⃣ **중요 변수(anchor)**: 어떤 column(항목)이 응답자의 전체 응답에서 가장 투표율이 높은 항목인지를 나타냅니다.

        ---

        📝 설문 조사 질문:
        {selected_question}

        📊 표 데이터 (선형화된 형태):
        {linearized_table}

        📈 주요 항목 (변수들 중 가장 투표율이 높은 변수):
        {anchor}

        📈 통계 분석 결과 (통계적으로 유의미한 대분류):
        {ft_test_summary}

        ---

        ⚠️ 참고: 만약 통계 분석 결과가 존재하지 않거나 사용자가 분석을 진행하지 않기로 선택한 경우, 주요 항목(anchor)을 중심으로 경향을 파악하고 이를 기반으로 요약할 것.

        Let's think step by step.

        🎯 분석 및 요약 지침:
        1. 반드시 **F/T test 결과에서 통계적으로 유의미한 대분류만을 중심으로 분석**할 것 (p-value < 0.05, 유의성 별(*) 존재)
        2. 모든 대분류 / 소분류를 나열하지 말고, **통계 분석 결과**에서 차이가 크고 의미 있는 대분류만 선택적으로 언급할 것
            - 통계적으로 유의미한 대분류가 없을 경우 (유의성 별(*)가 없을 경우) 주어진 p-value가 작은 대분류에서 주요 항목에 포함되는 대분류만 언급할 것
        3. **절대 해석하지 말 것**. 수치적 차이에 대한 인과 해석(예: 건강에 민감해서, 주변에 있어서 등)은 모두 **금지**함
        4. 외부 배경지식, 주관적 추론, 해석적 언급은 절대 금지. 표로부터 직접 **확인 가능한 사실만 서술**할 것
        5. 수치 기반 경향을 다음과 같은 형식으로 서술하며 음슴체로 작성할 것 (예: ~했음, ~로 나타났음):
        - 상대적으로 더 높은 경향 보였음
        - 낮은 값을 나타냈음
        6. 문장 간 연결어를 활용해 자연스럽게 서술하고, 너무 단조롭거나 반복적인 표현 (~했음. ~했음.)은 연속적으로 사용하지 말 것
        7. **유의성이 없거나, 검정에서 제외된 항목은 절대 언급하지 말 것**
        8. 모든 대분류가 유의성이 있고 중요하다면 모든 변수에 대해 설명하지 말고, **모든 대분류들이 중요했다고만 언급**할 것
        9. **특정 대분류가 가장 두드러진 차이를 보였을 경우**, 해당 경향을 강조할 것
        10. 숫자값을 직접 쓰지 말고 상대적인 경향만 언급할 것
        11. 통계적 유의미성으로 인해~~, 통계적으로 차이가 있어~~, 통계 결과가 없으므로~~ 이런식으로 통계 검정의 결과 유무에 대한 내용은 작성하지 말고, 통계 검정 결과가 있으면 해당 결과의 대분류를 중심으로 요약할 것.
        """,
        "English": """
        You are a data analyst summarizing trends across population groups based on statistical data.
        You must integrate the following two pieces of information to identify key patterns:

        1️⃣ **Statistical Test Results (ft_test_summary)**: indicates which row groups (categories) showed statistically significant differences
        2️⃣ **Key Variables (anchor)**: columns (features) that had the highest overall selection rate among respondents

        ---

        📝 Survey Question:
        {selected_question}

        📊 Table Data (Linearized):
        {linearized_table}

        📈 Key Variables (most frequently selected):
        {anchor}

        📈 Statistical Test Results (significant groups):
        {ft_test_summary}

        ---

        ⚠️ Note: If there are no statistical results or if the user has opted out of statistical analysis, summarize based on key variables (anchor) and observed trends around them.

        Let's think step by step.

        🎯 Guidelines for Analysis and Summary:
        1. Focus only on row groups that are statistically significant (p-value < 0.05, marked with asterisk)
        2. Do not list all groups/subgroups; highlight only those with major, meaningful differences
            - If there are no statistically significant categories (if there are no significant stars (*)), only mention the categories included in the main items with small p-values.
        3. **Do not interpret causality** (e.g., due to health sensitivity, etc.) – strictly prohibited
        4. No external knowledge or subjective speculation allowed – only describe facts verifiable from the table
        5. Describe trends using expressions like:
        - Showed relatively higher trend
        - Showed lower values
        6. Use natural transitions; avoid repetitive sentence structures
        7. **Do not mention non-significant or excluded categories**
        8. If all row groups are significant and important, don’t describe each — state they were all important
        9. **If one group shows the most outstanding difference**, emphasize that
        10. Avoid exact numerical values — describe only relative tendencies"""
    }
    HALLUCINATION_CHECK_PROMPT = {
        "한국어": """
        당신은 통계 해석 결과를 검증하는 전문가입니다.

        아래의 테이블 데이터와 통계 분석 결과(F/T-test 기반), 그리고 해당 결과를 바탕으로 작성된 요약 보고서가 주어집니다.

        📝 설문 문항:
        {selected_question}

        📊 선형화된 테이블:
        {linearized_table}

        📈 통계 분석 결과 (F/T-test 결과 요약):
        {ft_test_summary}

        🧾 생성된 요약:
        {table_analysis}

        ---

        이 요약이 위의 통계 분석 결과를 **정확하고 일관성 있게** 반영하고 있는지 평가해주세요.

        ⚠️ 주의 사항 (위반 시 우선 피드백 제공, 심각한 왜곡에 한해 reject):
        1. F/T-test에서 통계적으로 유의미한 차이가 확인된 대분류가 요약에 언급되지 않은 경우
            1.1  통계 분석 결과가 없을 경우, 실제 표와 생성된 요약에 왜곡이 없는지에 대해서만 평가해주세요.
        2. 유의미한 차이가 확인된 대분류에서의 주요 경향이나 수치 결과가 왜곡되어 해석된 경우 (e.g. 더 높지 않은데 더 높다고 잘못 된 주장을 하는 경우)

        🎯 평가 방식:
        - 요약이 전체적으로 신뢰할 만하고 통계 결과를 잘 반영하면 "accept"
        - 위 항목 위반 시 "reject: [이유]" 형식으로 출력

        ※ F/T-test 결과는 중요한 기준이지만, 사소한 누락은 reject 대신 피드백으로 처리해도 됩니다. 명백한 왜곡이나 중대한 누락 시에만 reject 하세요.
        """,
        "English": """
You are a statistical analysis auditor.

Below is a statistical summary table (linearized format), F/T-test results, and a summary report written based on them.

📝 Survey question:
{selected_question}

📊 Linearized Table:
{linearized_table}

📈 Statistical Test Summary (F/T-test):
{ft_test_summary}

🧾 Generated Summary Report:
{table_analysis}

---

Please evaluate whether the summary accurately and consistently reflects the statistical test results above.

⚠️ Evaluation Guidelines (Provide feedback first. Only reject in cases of serious distortion):
1. If a major category with statistically significant difference is missing in the summary
2. If the key trends or directions are misinterpreted (e.g. stating it’s higher when it isn’t)

🎯 Evaluation Instructions:
- If the summary is overall reliable and reflects the results well, answer "accept"
- If any violations occur, return: "reject: [reason]"

※ F/T-test is a key basis, but minor omissions can be handled with feedback only. Use "reject" only for clear distortions or major omissions.
"""}
    REVISION_PROMPT = {
        "한국어": """
        당신은 통계 데이터를 바탕으로 인구집단 간 패턴과 경향성을 객관적으로 요약하는 데이터 분석 전문가입니다.

        아래는 테이블 분석 결과에 대해 일부 잘못된 해석이 포함된 요약입니다. 피드백과 사전에 생성된 가설을 참고하여 잘못된 내용을 제거하고, 원본 데이터를 기반으로 수치 기반의 객관적 분석을 다시 작성할 것.

        📊 표 데이터 (선형화된 형태):
        {linearized_table}

        📈 주요 항목 (변수들 중 가장 투표율이 높은 변수):
        {anchor}

        📈 통계 분석 결과 (통계적으로 유의미한 대분류):
        {ft_test_summary}

        📝 Reject된 보고서 (수정해야할 보고서):
        {report_to_modify}

        ❗ 피드백 (수정이 필요한 이유 또는 잘못된 부분):
        {feedback}

        ---

        Let's think step by step

        🎯 수정 및 재작성 지침:

        1. 반드시 **F/T test 결과에서 통계적으로 유의미한 대분류만을 중심으로 분석**할 것 (p-value < 0.05, 유의성 별(*) 존재)
        2. 모든 대분류 / 소분류를 나열하지 말고, **검정 결과에서 차이가 크고 의미 있는 대분류만 선택적으로 언급**할 것
        3. **절대 해석하지 말 것**. 수치적 차이에 대한 인과 해석(예: 건강에 민감해서, 주변에 있어서 등)은 모두 금지함
        4. 외부 배경지식, 주관적 추론, 해석적 언급은 절대 금지. **표로부터 직접 확인 가능한 사실만 서술**할 것
        5. 수치 기반 경향을 다음과 같은 형식으로 서술할 것:
        - 상대적으로 더 높은 경향 보였음
        - 낮은 값을 나타냈음
        6. 보고서 음슴체로 작성할 것 (예: ~했음, ~로 나타났음)
        7. 문장 간 연결어를 활용해 자연스럽게 서술하고, 너무 단조롭거나 반복적인 표현 (~했음. ~했음.)은 피할 것
        8. **유의성이 없거나, 검정에서 제외된 항목은 절대 언급하지 말 것**
        9. **특정 대분류가 가장 두드러진 차이를 보였을 경우**, 해당 경향을 강조할 것
        10. 숫자값을 직접 쓰지 말고 상대적인 경향만 언급할 것
        11. 이전 수정 버전의 문장 표현을 재사용하지 않고, 새로운 어휘와 구조로 작성할 것
        12. 추론 과정을 작성하지 말고 최종적으로 수정한 보고서만 출력하세요.
        """,
        "English": """
        You are a data analyst who objectively summarizes population-level patterns based on statistical data.

        Below is a summary that contains partially incorrect interpretations of a statistical table analysis. Based on the given feedback and hypotheses, revise the summary by removing inaccurate parts and rewrite a new objective analysis grounded in the data.

        📊 Table data (linearized):
        {linearized_table}

        📈 Key variables (most selected):
        {anchor}

        📈 Statistical analysis results (significant categories):
        {ft_test_summary}

        📝 Rejected summary (needs revision):
        {report_to_modify}

        ❗ Feedback (reason for revision or incorrect points):
        {feedback}

        ---

        Let's think step by step

        🎯 Revision Guidelines:

        1. Focus only on categories that showed statistically significant differences in the F/T test (p-value < 0.05, marked with *)
        2. Do not list all categories/subcategories; mention only those with meaningful differences
        3. **Do not provide causal interpretations** – explanations like “due to health concerns” or similar are prohibited
        4. No external knowledge or speculation – write only what is verifiable from the table
        5. Describe trends in a form such as:
        - Showed relatively higher trend
        - Showed lower values
        6. Write in bullet-style declarative tone (e.g., “~was observed”, “~was shown”)
        7. Use transition words to make the sentences flow naturally; avoid repetitive sentence endings
        8. **Do not mention non-significant or excluded categories**
        9. **If a particular group showed the strongest difference**, emphasize it
        10. Do not mention actual numerical values, only describe relative trends
        11. Do not reuse previous sentence structures – use new wording and phrasing
        12. Do not explain the reasoning – only output the final revised summary
        """}
    POLISHING_PROMPT = {
        "한국어": """
        당신은 통계 데이터를 바탕으로 작성된 한국어 보고서를 다듬는 문체 전문 에디터입니다.

        아래는 통계 분석 결과를 요약한 초안입니다.  
        문장이 단절적이거나(~했음. ~했음 반복), 표현이 중복되거나, 불필요한 인사이트가 포함되어 있다면, **의미를 변경하지 않고** 더 읽기 쉬운 문장으로 다듬으세요.

        🎯 다음 지침을 엄격히 따르세요:

        1. **내용 추가, 삭제 금지** — 수치 기반의 원문 정보에서 벗어나는 새로운 해석, 배경 설명, 인과관계 유추는 모두 금지
        2. **'음슴체' 스타일 유지** — 예: ~했음, ~로 나타났음
        3. **인사이트 제거** — ‘건강에 민감해서’, ‘직접 영향을 받아서’ 등 주관적 추론은 모두 제거하고, 표로부터 드러나는 사실만 유지
        4. **통계적으로 유의한 항목(별표 포함된 대분류)**만 문장에 포함되었는지 확인할 것
        5. **중복 표현 제거 및 연결** — 동일 의미의 표현 반복("높게 나타났음", "관심이 높았음")은 피하고 연결어를 통해 간결하게 정리
        6. **단조로운 나열 피하기** — ~했음. ~했음. 반복하지 말고, 문장 구조를 다양화하고 연관된 항목은 한 문장으로 묶기
        7. **다양한 표현 혼용** — 아래와 같은 표현을 적절히 섞어 사용할 것:
        - 두드러진 경향 보였음
        - 뚜렷한 차이를 나타냈음
        - 상대적으로 높은 값을 보였음
        - 가장 높게 확인됐음
        8. **불필요한 소분류 또는 모든 그룹 나열 금지** — 요약은 특징적인 그룹 중심으로 간결하게 작성할 것
        9. **표 기반 사실만 요약** — 수치 기반 경향만 전달하고, 해석은 포함하지 말 것

        📝 기존 요약:
        {raw_summary}

        ---

        🎯 다듬어진 최종 요약문:
        """,
        "English": """
        You are a stylistic editor for statistical summaries written in Korean.

        Below is a draft summary of a statistical analysis.  
        If the sentences are too choppy ("~했음. ~했음." repetition), redundant, or include subjective insights, rewrite them into a more readable style **without altering their meaning**.

        🎯 Strictly follow these instructions:

        1. **No additions or deletions** — Do not add new interpretations, background, or causal reasoning beyond the original numeric-based content.
        2. **Keep declarative tone** — Use styles like: "~was observed", "~was shown"
        3. **Remove speculative insights** — Phrases like “due to health concerns” or “because they were affected” must be removed; stick only to observable facts
        4. **Only include categories with statistical significance (asterisked)** in the report
        5. **Eliminate and connect duplicates** — Avoid repeating the same idea (e.g., “was high”, “interest was high”); connect with transitions
        6. **Avoid monotonous structure** — Don’t repeat "~was observed." repeatedly; vary structure and combine related findings into single sentences
        7. **Use varied expressions** — Mix in phrases like:
        - Showed notable trend
        - Displayed clear difference
        - Exhibited relatively high values
        - Recorded the highest
        8. **Avoid listing all subgroups** — Focus on concise summaries of characteristic groups
        9. **Only report table-based facts** — Do not include interpretations; describe numeric trends only

        📝 Original draft:
        {raw_summary}

        ---

        🎯 Polished final summary:
        """
        } 