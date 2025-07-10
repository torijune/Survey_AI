import pandas as pd
import io
import re
from typing import Dict, Any, List
from collections import defaultdict


class ExcelLoader:
    """Excel 파일 로딩 클라이언트"""
    
    def __init__(self):
        pass
    
    def load_survey_tables(self, file_content: bytes, file_name: str, sheet_name: str = "통계표") -> Dict[str, Any]:
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
    
    def normalize_key(self, key: str) -> str:
        """키 정규화"""
        return key.replace('-', '_').replace('.', '_')
    
    def find_matching_key(self, target_key: str, available_keys: List[str]) -> str:
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