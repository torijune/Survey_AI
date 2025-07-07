import os
import json
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from docx import Document
import re
from io import BytesIO

class DataProcessor:
    def __init__(self):
        pass
    
    async def run_statistical_test(
        self,
        file_content: bytes,
        file_name: str,
        test_type: str = "auto",
        question_key: str = ""
    ) -> Dict[str, Any]:
        """통계 분석 실행"""
        try:
            # 파일을 DataFrame으로 로드
            if file_name.endswith('.xlsx') or file_name.endswith('.xls'):
                df = pd.read_excel(io.BytesIO(file_content))
            elif file_name.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(file_content))
            else:
                raise ValueError(f"지원하지 않는 파일 형식: {file_name}")
            
            # 기본 통계 계산
            numeric_columns = df.select_dtypes(include=[np.number]).columns.tolist()
            
            stats = {
                "file_name": file_name,
                "test_type": test_type,
                "question_key": question_key,
                "total_rows": len(df),
                "total_columns": len(df.columns),
                "numeric_columns": numeric_columns,
                "missing_values": df.isnull().sum().to_dict(),
                "basic_stats": {}
            }
            
            # 숫자 컬럼에 대한 기본 통계
            for col in numeric_columns:
                stats["basic_stats"][col] = {
                    "mean": float(df[col].mean()),
                    "std": float(df[col].std()),
                    "min": float(df[col].min()),
                    "max": float(df[col].max()),
                    "count": int(df[col].count())
                }
            
            # 상관관계 분석
            if len(numeric_columns) > 1:
                correlation_matrix = df[numeric_columns].corr()
                stats["correlation"] = correlation_matrix.to_dict()
            
            return {
                "success": True,
                "result": stats
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def process_survey_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """설문 데이터 처리"""
        # 설문 데이터 특화 처리 로직
        result = {
            "question_keys": [],
            "question_texts": {},
            "tables": {}
        }
        
        # 질문 키 추출 (첫 번째 컬럼에서)
        if len(df.columns) > 0:
            first_col = df.columns[0]
            question_keys = df[first_col].dropna().unique().tolist()
            result["question_keys"] = question_keys
            
            # 각 질문별 테이블 생성
            for key in question_keys:
                if key in df[first_col].values:
                    question_data = df[df[first_col] == key]
                    result["tables"][key] = {
                        "columns": question_data.columns.tolist(),
                        "data": question_data.values.tolist()
                    }
        
        return result 

def extract_guide_subjects_from_docx_bytes(docx_bytes: bytes):
    """
    DOCX 파일의 bytes를 받아서, 본문과 표에서 주제/질문(섹션명, 질문 등)을 robust하게 추출한다.
    """
    doc = Document(BytesIO(docx_bytes))
    # 1. 본문 텍스트 추출
    paragraph_texts = [para.text for para in doc.paragraphs if para.text.strip() != ""]
    # 2. 표 텍스트 추출
    table_texts = []
    for table in doc.tables:
        for row in table.rows:
            row_text = [cell.text.strip() for cell in row.cells]
            table_texts.append("\t".join(row_text))  # 탭으로 구분
    # 3. 전체 텍스트 합치기
    full_text = "\n".join(paragraph_texts + table_texts)
    # 4. 주제/질문 robust 추출
    subjects = []
    for line in full_text.split('\n'):
        line = line.strip()
        # 숫자+마침표/괄호/콜론, ▷, -, •, PART, 소제목 등
        if re.match(r'^(PART|[0-9]+[.)]|[0-9]+:|▷|-|•)', line):
            subjects.append(line)
        # 질문형 문장
        elif re.search(r'(무엇|어떻게|있나요|생각하시나요|알고 계시나요|이유|방식|방안|의견|경험|느낀 점|추천|평가|의미|정의|차이|특징|장점|단점|문제|해결|필요|중요|역할|기대|효과|방향|계획|전략|방법|있으신가요|있습니까|있을까요|있을지)', line):
            subjects.append(line)
    return subjects 