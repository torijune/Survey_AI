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
import matplotlib.pyplot as plt
import seaborn as sns
from io import BytesIO
import base64
from collections import defaultdict

load_dotenv()

class SurveyTable:
    """설문 테이블 데이터 구조"""
    def __init__(self, data: List[List[Any]], columns: List[str], question_text: str, question_key: str):
        self.data = data
        self.columns = columns
        self.question_text = question_text
        self.question_key = question_key

class SurveyData:
    """설문 데이터 구조"""
    def __init__(self, tables: Dict[str, SurveyTable], question_texts: Dict[str, str], question_keys: List[str]):
        self.tables = tables
        self.question_texts = question_texts
        self.question_keys = question_keys

class VisualizationWorkflow:
    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.3,
            api_key=os.getenv("OPENAI_API_KEY")
        )
    
    def normalize_key(self, key: str) -> str:
        """키 정규화"""
        return key.replace('-', '_').replace('.', '_')
    
    def linearize_row_wise(self, table: SurveyTable) -> str:
        """테이블을 행 단위로 선형화"""
        return ' | '.join([
            '; '.join([f"{table.columns[idx]}: {val}" for idx, val in enumerate(row)])
            for row in table.data
        ])
    
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
    
    async def load_survey_tables(self, file_content: bytes, file_name: str, sheet_name: str = "통계표"):
        """설문 테이블 로드"""
        try:
            df = pd.read_excel(io.BytesIO(file_content), sheet_name=sheet_name, header=None)

            pattern = r"^[A-Z]+\d*[-.]?\d*\."
            question_indices = df[df[0].astype(str).str.match(pattern)].index.tolist()

            tables = {}
            question_texts = {}
            question_keys = []
            key_counts = defaultdict(int)

            for i, start in enumerate(question_indices):
                end = question_indices[i + 1] if i + 1 < len(question_indices) else len(df)
                title = str(df.iloc[start, 0]).strip()

                match = re.match(pattern, title)
                if not match:
                    continue
                base_key = match.group().rstrip(".")
                key_counts[base_key] += 1
                suffix = f"_{key_counts[base_key]}" if key_counts[base_key] > 1 else ""
                final_key = base_key + suffix
                final_key_norm = self.normalize_key(final_key)

                question_texts[final_key_norm] = title + "(전체 단위 : %)"
                question_keys.append(final_key_norm)

                table = df.iloc[start + 1:end].reset_index(drop=True)

                if len(table) >= 2:
                    first_header = table.iloc[0].fillna('').astype(str)
                    second_header = table.iloc[1].fillna('').astype(str)

                    title_text = None
                    title_col_idx = None
                    for idx, val in enumerate(first_header):
                        if idx > 2 and isinstance(val, str) and len(val) > 0:
                            if val not in ['관심없다', '보통', '관심있다', '평균']:
                                title_text = val
                                title_col_idx = idx
                                break

                    new_columns = []
                    for idx in range(len(first_header)):
                        if idx == 0:
                            new_columns.append("대분류")
                        elif idx == 1:
                            new_columns.append("소분류")
                        elif idx == 2:
                            new_columns.append("사례수")
                        else:
                            first_val = "" if (title_col_idx is not None and first_header.iloc[idx] == title_text) else first_header.iloc[idx]
                            combined = (first_val + " " + second_header.iloc[idx]).strip().replace('nan', '').strip()
                            new_columns.append(combined)

                    table = table.drop([0, 1]).reset_index(drop=True)
                    table.columns = new_columns
                    table = table.dropna(axis=1, how='all')
                    table = table.dropna(axis=0, how='all')
                    table["대분류"] = table["대분류"].ffill()
                    table = table.dropna(subset=["대분류", "사례수"], how="all").reset_index(drop=True)
                    if len(table) > 2:
                        table = table.iloc[:-1].reset_index(drop=True)

                    for col in table.columns:
                        try:
                            numeric_col = pd.to_numeric(table[col], errors='coerce')
                            if numeric_col.notna().any():
                                table[col] = numeric_col.round(1)
                        except:
                            continue

                    tables[final_key_norm] = table

            return {
                "tables": tables,
                "question_texts": question_texts,
                "question_keys": question_keys
            }
            
        except Exception as e:
            raise Exception(f"설문 테이블 로드 실패: {str(e)}")
    
    def create_visualization(self, table: SurveyTable, chart_type: str = "bar") -> str:
        """시각화 생성"""
        try:
            # DataFrame 생성
            df = pd.DataFrame(table.data, columns=table.columns)
            
            # 숫자 컬럼 찾기
            numeric_cols = []
            for col in df.columns:
                if col not in ["대분류", "소분류", "사례수"]:
                    try:
                        df[col] = pd.to_numeric(df[col], errors='coerce')
                        if not df[col].isna().all():
                            numeric_cols.append(col)
                    except:
                        continue
            
            if not numeric_cols:
                return "시각화할 수 있는 숫자 데이터가 없습니다."
            
            # 시각화 생성
            plt.figure(figsize=(12, 8))
            
            if chart_type == "bar":
                # 막대 그래프
                df_plot = df[["대분류"] + numeric_cols].groupby("대분류").mean()
                df_plot.plot(kind='bar', ax=plt.gca())
                plt.title(f"{table.question_text}")
                plt.xlabel("대분류")
                plt.ylabel("응답률 (%)")
                plt.xticks(rotation=45)
                plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
                plt.tight_layout()
            
            elif chart_type == "pie":
                # 파이 차트 (첫 번째 숫자 컬럼만 사용)
                col = numeric_cols[0]
                df_plot = df.groupby("대분류")[col].mean()
                plt.pie(df_plot.values, labels=df_plot.index, autopct='%1.1f%%')
                plt.title(f"{table.question_text} - {col}")
            
            elif chart_type == "line":
                # 선 그래프
                df_plot = df[["대분류"] + numeric_cols].groupby("대분류").mean()
                df_plot.plot(kind='line', marker='o', ax=plt.gca())
                plt.title(f"{table.question_text}")
                plt.xlabel("대분류")
                plt.ylabel("응답률 (%)")
                plt.xticks(rotation=45)
                plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
                plt.tight_layout()
            
            # 이미지를 base64로 인코딩
            buffer = BytesIO()
            plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
            buffer.seek(0)
            image_base64 = base64.b64encode(buffer.getvalue()).decode()
            plt.close()
            
            return f"data:image/png;base64,{image_base64}"
            
        except Exception as e:
            return f"시각화 생성 실패: {str(e)}"
    
    async def analyze_table(self, table: SurveyTable) -> Dict[str, Any]:
        """테이블 분석"""
        try:
            # 테이블 선형화
            linearized_table = self.linearize_row_wise(table)
            
            # LLM 분석
            prompt = f"""다음 설문 데이터를 분석해주세요.

질문: {table.question_text}
데이터: {linearized_table}

다음 형식으로 분석해주세요:
1. 주요 발견사항
2. 응답 패턴 분석
3. 인사이트 및 함의
4. 추가 분석 제안"""

            messages = [
                {"role": "system", "content": "당신은 설문 데이터 분석 전문가입니다."},
                {"role": "user", "content": prompt}
            ]
            
            analysis = await self.make_openai_call(messages)
            
            # 시각화 생성
            bar_chart = self.create_visualization(table, "bar")
            pie_chart = self.create_visualization(table, "pie")
            line_chart = self.create_visualization(table, "line")
            
            return {
                "analysis": analysis,
                "visualizations": {
                    "bar_chart": bar_chart,
                    "pie_chart": pie_chart,
                    "line_chart": line_chart
                },
                "table_summary": {
                    "total_rows": len(table.data),
                    "total_columns": len(table.columns),
                    "categories": list(set([row[0] for row in table.data if row[0]])),
                    "sample_data": table.data[:5] if table.data else []
                }
            }
            
        except Exception as e:
            return {
                "error": str(e),
                "analysis": "분석 중 오류가 발생했습니다.",
                "visualizations": {},
                "table_summary": {}
            }
    
    async def execute(self, file_content: bytes, file_name: str, selected_key: str = "", options: Dict[str, Any] = None) -> Dict[str, Any]:
        """시각화 워크플로우 실행"""
        try:
            on_step = options.get("on_step") if options else None
            
            # 파일에서 테이블 로드
            survey_data = await self.load_survey_tables(file_content, file_name)
            
            results = {}
            
            if selected_key and selected_key in survey_data["tables"]:
                # 특정 테이블만 분석
                if on_step:
                    on_step(f"선택된 테이블 분석 중: {selected_key}")
                
                table = survey_data["tables"][selected_key]
                result = await self.analyze_table(table)
                results[selected_key] = result
                
            else:
                # 모든 테이블 분석
                for key, table in survey_data["tables"].items():
                    if on_step:
                        on_step(f"테이블 분석 중: {key}")
                    
                    result = await self.analyze_table(table)
                    results[key] = result
            
            return {
                "success": True,
                "results": results,
                "survey_data": {
                    "question_keys": survey_data["question_keys"],
                    "question_texts": survey_data["question_texts"]
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            } 