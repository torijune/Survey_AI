import pandas as pd
import numpy as np
from scipy import stats
from typing import Dict, Any, List


class StatisticalTester:
    """통계 검정 클라이언트"""
    
    def __init__(self):
        pass
    
    def assign_significance_stars(self, p_value: float) -> str:
        """유의성 별표 할당"""
        if p_value < 0.001:
            return "***"
        elif p_value < 0.01:
            return "**"
        elif p_value < 0.05:
            return "*"
        else:
            return ""
    
    def extract_demo_mapping_from_dataframe(self, df: pd.DataFrame, column: str = "Unnamed: 0") -> Dict[str, str]:
        """데이터프레임에서 인구통계 매핑 추출"""
        print(f"[extract_demo_mapping_from_dataframe] called with column: {column}")
        col = df[column].dropna().astype(str).reset_index(drop=True)
        print(f"[extract_demo_mapping_from_dataframe] col values: {col.tolist()}")
        cut_idx = None
        for i, val in enumerate(col):
            if val.strip() == 'DEMO1':
                cut_idx = i
                break
        sliced = col[:cut_idx] if cut_idx is not None else col

        demo_dict = {}
        import re
        for entry in sliced:
            entry = str(entry).strip()
            match = re.match(r"(DEMO\d+)[\s'\"]+(.+?)[\'\"\s\.]*$", entry)
            if match:
                key = match.group(1)
                label = match.group(2).strip()
                demo_dict[key] = label
        print(f"[extract_demo_mapping_from_dataframe] demo_dict: {demo_dict}")
        return demo_dict
    
    def summarize_ft_test(self, result_df: pd.DataFrame, lang: str = "한국어") -> str:
        """F/T 검정 결과 요약"""
        if not isinstance(result_df, pd.DataFrame) or result_df.empty:
            return "통계 분석 결과가 없습니다."
        significant = result_df[result_df["유의성"] != ""]
        summary = []
        if not significant.empty:
            sig_items = significant["대분류"].tolist()
            if len(sig_items) == len(result_df):
                summary.append("모든 항목에서 통계적으로 유의미한 차이가 관찰되었음. 대분류 전반에 걸쳐 의미 있는 차이가 존재함." if lang == "한국어" else "All categories showed statistically significant differences. Broad variation was observed across major groups.")
            else:
                summary.append(f"{', '.join(sig_items)}는 통계적으로 유의한 차이를 보였음." if lang == "한국어" else f"{', '.join(sig_items)} showed statistically significant differences.")
        else:
            if not result_df.empty:
                top3 = result_df.nsmallest(3, "p-value")[["대분류", "p-value"]]
                top3_text = ", ".join(f"{row['대분류']} (p={row['p-value']})" for _, row in top3.iterrows())
                summary.append(f"통계적으로 유의한 항목은 없었지만, 상대적으로 p-value가 낮은 항목은 {top3_text} 순이었음." if lang == "한국어" else f"No items reached statistical significance, but the ones with the lowest p-values were: {top3_text}.")
        return "  ".join(summary)
    
    def run_statistical_tests(self, test_type: str, df: pd.DataFrame, question_key: str, demo_dict: Dict[str, str]) -> pd.DataFrame:
        """통계 검정 실행"""
        print(f"[run_statistical_tests] test_type: {test_type}")
        print(f"[run_statistical_tests] question_key: {question_key}")
        print(f"[run_statistical_tests] demo_dict: {demo_dict}")
        print(f"[run_statistical_tests] df.columns: {df.columns.tolist()}")
        
        if test_type == "ft_test":
            return self.run_ft_test_df(df, question_key, demo_dict)
        elif test_type == "chi_square":
            return self.run_chi_square_test_df(df, question_key, demo_dict)
        elif test_type == "manual":
            return self.run_manual_analysis(df, question_key, demo_dict)
        else:
            print(f"[run_statistical_tests] Invalid test_type: {test_type}")
            raise ValueError(f"❌ 잘못된 test_type: {test_type}")
    
    def run_ft_test_df(self, df: pd.DataFrame, question_key: str, demo_dict: Dict[str, str]) -> pd.DataFrame:
        """F/T 검정 실행"""
        question_key = question_key.replace("-", "_").strip()
        rows = []
        for demo_col, label in demo_dict.items():
            print(f"  [FT] demo_col: {demo_col}, label: {label}")
            if demo_col not in df.columns:
                print(f"    [FT] demo_col '{demo_col}' not in df.columns")
                continue
            try:
                groups = df.groupby(demo_col)[question_key].apply(list)
                group_values = [pd.Series(values).dropna().tolist() for values in groups]
                print(f"    [FT] group_values lens: {[len(g) for g in group_values]}")
                if len(group_values) < 2:
                    print(f"    [FT] group_values < 2, skip")
                    continue
                levene_stat, levene_p = stats.levene(*group_values)
                if len(group_values) == 2:
                    test_stat, test_p = stats.ttest_ind(
                        group_values[0], group_values[1],
                        equal_var=(levene_p > 0.05)
                    )
                else:
                    test_stat, test_p = stats.f_oneway(*group_values)
                row = {
                    "대분류": label,
                    "통계량": round(abs(test_stat), 3),
                    "p-value": round(test_p, 4),
                    "유의성": self.assign_significance_stars(test_p)
                }
                print(f"    [FT] result row: {row}")
                rows.append(row)
            except Exception as e:
                print(f"    [FT] Exception: {e}")
                continue
        result_df = pd.DataFrame(rows)
        print(f"[run_ft_test_df] result_df shape: {result_df.shape}")
        print(f"[run_ft_test_df] result_df: {result_df}")
        return result_df
    
    def run_chi_square_test_df(self, df: pd.DataFrame, question_key: str, demo_dict: Dict[str, str]) -> pd.DataFrame:
        """카이제곱 검정 실행"""
        question_key = question_key.replace("-", "_").strip()
        rows = []
        for demo_col, label in demo_dict.items():
            print(f"  [CHI] demo_col: {demo_col}, label: {label}")
            if demo_col not in df.columns:
                print(f"    [CHI] demo_col '{demo_col}' not in df.columns")
                continue
            try:
                normalized_columns = {col.replace("-", "_").strip(): col for col in df.columns}
                contingency_table = pd.crosstab(df[demo_col], df[normalized_columns[question_key]])
                print(f"    [CHI] contingency_table shape: {contingency_table.shape}")
                if contingency_table.shape[0] < 2 or contingency_table.shape[1] < 2:
                    print(f"    [CHI] contingency_table too small, skip")
                    continue
                chi2, p, dof, expected = stats.chi2_contingency(contingency_table)
                row = {
                    "대분류": label,
                    "통계량": round(chi2, 3),
                    "p-value": round(p, 4),
                    "유의성": self.assign_significance_stars(p)
                }
                print(f"    [CHI] result row: {row}")
                rows.append(row)
            except Exception as e:
                print(f"    [CHI] Exception: {e}")
                continue
        result_df = pd.DataFrame(rows)
        print(f"[run_chi_square_test_df] result_df shape: {result_df.shape}")
        print(f"[run_chi_square_test_df] result_df: {result_df}")
        return result_df
    
    def run_manual_analysis(self, df: pd.DataFrame, question_key: str, demo_dict: Dict[str, str]) -> pd.DataFrame:
        """수동 분석 실행"""
        question_key = question_key.replace("-", "_").strip()
        try:
            overall_row = df[df["대분류"].astype(str).str.strip() == "전 체"]
            if overall_row.empty:
                print("    [MANUAL] '전 체' 대분류 행이 존재하지 않습니다.")
                return pd.DataFrame([])
            overall_value = overall_row[question_key].values[0]
            overall_n = overall_row["사례수"].values[0]
            overall_std = df[question_key].std()
            std_error = overall_std / np.sqrt(overall_n)
            z_score = 1.96
            ci_lower = overall_value - z_score * std_error
            ci_upper = overall_value + z_score * std_error
            rows = []
            for idx, row in df.iterrows():
                if row["대분류"] == "전 체":
                    continue
                group_value = row[question_key]
                group_label = f"{row['대분류']} - {row['소분류']}" if pd.notna(row['소분류']) else row['대분류']
                significant = group_value < ci_lower or group_value > ci_upper
                rows.append({
                    "대분류": group_label,
                    "평균값": group_value,
                    "유의미 여부": "유의미함" if significant else "무의미함",
                    "기준 평균": overall_value,
                    "신뢰구간": f"{round(ci_lower,1)} ~ {round(ci_upper,1)}",
                    "유의성": "*" if significant else ""
                })
            result_df = pd.DataFrame(rows)
            print(f"[run_manual_analysis] result_df shape: {result_df.shape}")
            print(f"[run_manual_analysis] result_df: {result_df}")
            return result_df
        except Exception as e:
            print(f"    [MANUAL] Exception: {e}")
            return pd.DataFrame([]) 