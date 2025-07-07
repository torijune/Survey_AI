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
    
    async def load_survey_tables(self, file_content: bytes, file_name: str, sheet_name: str = "통계표") -> SurveyData:
        """설문 테이블 로드"""
        try:
            # Excel 파일 읽기
            workbook = openpyxl.load_workbook(io.BytesIO(file_content), data_only=True)
            
            # 시트 선택
            worksheet = workbook[sheet_name] if sheet_name in workbook.sheetnames else workbook.active
            
            # 데이터 추출
            data = []
            for row in worksheet.iter_rows(values_only=True):
                data.append(row)
            
            # 질문 인덱스 찾기
            question_indices = []
            patterns = [
                r'^[A-Z]+\d*[-.]?\d*\.',  # A1., B2., A1-1. 등
                r'^[A-Z]+\d*$',           # A1, B2 등 (점 없음)
                r'^[A-Z]+\d*[-.]?\d*$',   # A1-1, B2-1 등 (점 없음)
                r'^Q\d+',                 # Q1, Q2 등
                r'^질문\s*\d+',           # 질문 1, 질문 2 등
            ]
            
            for i, row in enumerate(data):
                if row and row[0]:
                    cell_value = str(row[0])
                    for pattern in patterns:
                        if re.match(pattern, cell_value):
                            question_indices.append(i)
                            break
            
            # 질문을 찾지 못한 경우 대체 방법
            if not question_indices:
                for i in range(1, min(len(data), 20)):
                    if data[i] and data[i][0] and len(str(data[i][0])) > 5:
                        cell_value = str(data[i][0])
                        if not any(keyword in cell_value for keyword in ['대분류', '소분류']):
                            question_indices.append(i)
                            break
            
            # 테이블 파싱
            tables = {}
            question_texts = {}
            question_keys = []
            key_counts = {}
            
            for i, idx in enumerate(question_indices):
                if idx + 1 < len(data):
                    # 질문 텍스트
                    question_text = str(data[idx][0]) if data[idx] and data[idx][0] else f"Question_{i+1}"
                    question_key = f"Q{i+1}"
                    
                    # 테이블 데이터
                    table_data = []
                    for j in range(idx + 1, len(data)):
                        if data[j] and any(data[j]):  # 빈 행이 아닌 경우
                            table_data.append(data[j])
                        elif j > idx + 1 and not any(data[j]):  # 연속된 빈 행
                            break
                    
                    if table_data:
                        # 컬럼 생성
                        columns = []
                        if table_data:
                            # 첫 번째 행을 헤더로 사용
                            header_row = table_data[0]
                            for col_idx, cell in enumerate(header_row):
                                if col_idx == 0:
                                    columns.append("대분류")
                                elif col_idx == 1:
                                    columns.append("소분류")
                                elif col_idx == 2:
                                    columns.append("사례수")
                                else:
                                    col_name = str(cell).strip() if cell else f"Column_{col_idx}"
                                    columns.append(col_name)
                        
                        # 데이터 처리
                        processed_data = []
                        for row in table_data[1:]:
                            processed_row = []
                            for cell in row:
                                if cell is None or cell == '' or (isinstance(cell, float) and np.isnan(cell)):
                                    processed_row.append('')
                                else:
                                    processed_row.append(str(cell))
                            processed_data.append(processed_row)
                        
                        # 빈 열 제거
                        if processed_data and columns:
                            valid_columns = []
                            valid_data = []
                            
                            for col_idx, col_name in enumerate(columns):
                                has_value = False
                                for row in processed_data:
                                    if col_idx < len(row) and row[col_idx] and row[col_idx].strip():
                                        has_value = True
                                        break
                                
                                if has_value:
                                    valid_columns.append(col_name)
                                    col_data = []
                                    for row in processed_data:
                                        col_data.append(row[col_idx] if col_idx < len(row) else '')
                                    valid_data.append(col_data)
                            
                            # 데이터를 행 단위로 변환
                            if valid_data:
                                final_data = []
                                for row_idx in range(len(valid_data[0])):
                                    row = []
                                    for col_idx in range(len(valid_data)):
                                        row.append(valid_data[col_idx][row_idx])
                                    final_data.append(row)
                                
                                # 빈 행 제거
                                final_data = [row for row in final_data if any(cell.strip() for cell in row)]
                                
                                if final_data:
                                    # 대분류 forward fill
                                    last_category = ''
                                    for row in final_data:
                                        if row[0] and row[0].strip():
                                            last_category = row[0]
                                        else:
                                            row[0] = last_category
                                    
                                    # 요약 행 제거
                                    if len(final_data) > 2:
                                        final_data = final_data[:-1]
                                    
                                    table = SurveyTable(
                                        data=final_data,
                                        columns=valid_columns,
                                        question_text=question_text,
                                        question_key=question_key
                                    )
                                    
                                    tables[question_key] = table
                                    question_texts[question_key] = question_text
                                    question_keys.append(question_key)
            
            return SurveyData(tables, question_texts, question_keys)
            
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
            
            if selected_key and selected_key in survey_data.tables:
                # 특정 테이블만 분석
                if on_step:
                    on_step(f"선택된 테이블 분석 중: {selected_key}")
                
                table = survey_data.tables[selected_key]
                result = await self.analyze_table(table)
                results[selected_key] = result
                
            else:
                # 모든 테이블 분석
                for key, table in survey_data.tables.items():
                    if on_step:
                        on_step(f"테이블 분석 중: {key}")
                    
                    result = await self.analyze_table(table)
                    results[key] = result
            
            return {
                "success": True,
                "results": results,
                "survey_data": {
                    "question_keys": survey_data.question_keys,
                    "question_texts": survey_data.question_texts
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            } 