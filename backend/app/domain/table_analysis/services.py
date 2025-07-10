from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from ..table_analysis.entities import AgentState
from ...infrastructure.openai.client import OpenAIClient
from ...infrastructure.file.excel_loader import ExcelLoader
from ...infrastructure.statistics.statistical_tester import StatisticalTester
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
        - !!!주의!!! "1순위"만 있는 경우는 manual이 아님 (ft_test와 chi_square 중 하나로 결정)
    - 예시: "복수응답", "다중응답", "1+2순위", "1+2+3순위", "ranking", "우선순위(1+2)", "다중선택"
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
- "1순위"만 있는 경우는 manual이 아님 (ft_test와 chi_square 중 하나로 결정)
- "1+2순위", "1+2+3순위" 등 복수 순위만 manual로 분류

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
            import pandas as pd
            from io import BytesIO
            if hasattr(state, 'raw_data_file') and state.raw_data_file is not None:
                print("[ft_analysis_node] raw_data_file exists")
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
                summary_text = self.statistical_tester.summarize_ft_test(result_df, lang=lang)
                state.raw_data = raw_data
                state.ft_test_result = result_df
                state.ft_test_summary = summary_text
            else:
                print("[ft_analysis_node] raw_data_file is None")
                state.ft_error = "raw_data_file이 없습니다."
        except Exception as e:
            print(f"[ft_analysis_node] Exception: {e}")
            state.ft_error = str(e)
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

    # --- PROMPT DEFINITIONS ---
    TABLE_ANALYSIS_PROMPT = {
        "한국어": """
아래는 설문 문항, 선형화된 통계표, F/T-test 요약, 앵커(주요 항목)입니다.\n\n문항: {selected_question}\n표: {linearized_table}\nF/T-test 요약: {ft_test_summary}\n주요 항목: {anchor}\n\n이 정보를 바탕으로, 인구집단 간의 주요 패턴과 경향성을 2~4문장으로 요약하세요.\n- 객관적이고 간결하게 작성\n- 수치, 경향, 차이점 중심\n- 외부 지식 사용 금지\n""",
        "English": """
Below are the survey question, linearized table, F/T-test summary, and anchor (key items).\n\nQuestion: {selected_question}\nTable: {linearized_table}\nF/T-test summary: {ft_test_summary}\nAnchor: {anchor}\n\nBased on this information, summarize the main patterns and trends among population groups in 2-4 sentences.\n- Be objective and concise\n- Focus on numbers, trends, and differences\n- Do not use external knowledge\n"""
    }
    HALLUCINATION_CHECK_PROMPT = {
        "한국어": """
아래는 설문 문항, 선형화된 표, F/T-test 요약, 그리고 분석 결과입니다.\n\n문항: {selected_question}\n표: {linearized_table}\nF/T-test 요약: {ft_test_summary}\n분석 결과: {table_analysis}\n\n이 분석 결과가 표와 요약에 근거해 타당한지 검증하세요.\n- 만약 표/요약에 없는 내용을 임의로 해석했다면 reject: (이유)\n- 타당하다면 accept\n답변은 'accept' 또는 'reject: 이유'로만 해주세요.\n""",
        "English": """
Below are the survey question, linearized table, F/T-test summary, and analysis result.\n\nQuestion: {selected_question}\nTable: {linearized_table}\nF/T-test summary: {ft_test_summary}\nAnalysis result: {table_analysis}\n\nCheck if the analysis is valid based on the table and summary.\n- If there is any hallucination or unsupported claim, reply 'reject: (reason)'\n- If valid, reply 'accept'\nAnswer only 'accept' or 'reject: reason'.\n"""
    }
    REVISION_PROMPT = {
        "한국어": """
아래는 선형화된 표, F/T-test 요약, 앵커, 기존 분석 결과, 피드백입니다.\n\n표: {linearized_table}\nF/T-test 요약: {ft_test_summary}\n주요 항목: {anchor}\n기존 분석: {report_to_modify}\n피드백: {feedback}\n\n피드백을 반영해 분석 결과를 2~4문장으로 수정하세요.\n- 객관적이고 간결하게 작성\n- 수치, 경향, 차이점 중심\n- 외부 지식 사용 금지\n""",
        "English": """
Below are the linearized table, F/T-test summary, anchor, previous analysis, and feedback.\n\nTable: {linearized_table}\nF/T-test summary: {ft_test_summary}\nAnchor: {anchor}\nPrevious analysis: {report_to_modify}\nFeedback: {feedback}\n\nRevise the analysis in 2-4 sentences reflecting the feedback.\n- Be objective and concise\n- Focus on numbers, trends, and differences\n- Do not use external knowledge\n"""
    }
    POLISHING_PROMPT = {
        "한국어": """
아래는 통계 데이터를 바탕으로 작성된 요약문입니다.\n\n{raw_summary}\n\n이 문장을 더 자연스럽고 명확하게 다듬어주세요.\n- 불필요한 반복, 군더더기 제거\n- 문장 간 연결 자연스럽게\n- 의미 왜곡 없이 간결하게\n""",
        "English": """
Below is a summary based on statistical data.\n\n{raw_summary}\n\nPolish this text to be more natural and clear.\n- Remove unnecessary repetition\n- Make sentence transitions smooth\n- Be concise without distorting meaning\n"""
    } 