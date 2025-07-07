from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
import scipy.stats as stats
import io
import re

app = Flask(__name__)
CORS(app)

# ✅ 유의성 별 부여 함수
def assign_significance_stars(p_value):
    if p_value < 0.001:
        return "***"
    elif p_value < 0.01:
        return "**"
    elif p_value < 0.05:
        return "*"
    else:
        return ""

# ✅ DEMO 매핑 추출 함수
def extract_demo_mapping_from_dataframe(df, column="Unnamed: 0"):
    col = df[column].dropna().astype(str).reset_index(drop=True)
    cut_idx = None
    for i, val in enumerate(col):
        if val.strip() == 'DEMO1':
            cut_idx = i
            break
    sliced = col[:cut_idx] if cut_idx is not None else col

    demo_dict = {}
    for entry in sliced:
        entry = str(entry).strip()
        match = re.match(r"(DEMO\d+)[\s'\"]+(.+?)['\"\s\.]*$", entry)
        if match:
            key = match.group(1)
            label = match.group(2).strip()
            demo_dict[key] = label

    return demo_dict

# ✅ 자연어 요약 생성 함수
def summarize_ft_test(result_df: pd.DataFrame, lang: str = "한국어") -> str:
    # 유의성 있는 항목(별이 하나 이상 붙은 항목) 필터링
    significant = result_df[result_df["유의성"] != ""]
    non_significant = result_df[result_df["유의성"] == ""]

    summary = []

    if not significant.empty:
        sig_items = significant["대분류"].tolist()
        if len(sig_items) == len(result_df):
            summary.append("모든 항목에서 통계적으로 유의미한 차이가 관찰되었음. 대분류 전반에 걸쳐 의미 있는 차이가 존재함." if lang == "한국어" else "All categories showed statistically significant differences. Broad variation was observed across major groups.")
        else:
            summary.append(f"{', '.join(sig_items)}는 통계적으로 유의한 차이를 보였음." if lang == "한국어" else f"{', '.join(sig_items)} showed statistically significant differences.")
    else:
        # 유의한 항목이 전혀 없을 경우 → p-value 기준 상위 3개 언급
        if not result_df.empty:
            top3 = result_df.nsmallest(3, "p-value")[["대분류", "p-value"]]
            top3_text = ", ".join(f"{row['대분류']} (p={row['p-value']})" for _, row in top3.iterrows())
            summary.append(f"통계적으로 유의한 항목은 없었지만, 상대적으로 p-value가 낮은 항목은 {top3_text} 순이었음." if lang == "한국어" else f"No items reached statistical significance, but the ones with the lowest p-values were: {top3_text}.")

    return "  ".join(summary)

def run_statistical_tests(test_type, df, question_key, demo_dict):
    # ✅ F/T-test 실행 함수
    def run_ft_test_df(df: pd.DataFrame, question_key: str, demo_dict: dict) -> pd.DataFrame:
        question_key = question_key.replace("-", "_").strip()
        rows = []

        for demo_col, label in demo_dict.items():
            if demo_col not in df.columns:
                continue

            try:
                groups = df.groupby(demo_col)[question_key].apply(list)
                group_values = [pd.Series(values).dropna().tolist() for values in groups]

                if len(group_values) < 2:
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
                    "유의성": assign_significance_stars(test_p)
                }
                rows.append(row)

            except Exception:
                continue

        result_df = pd.DataFrame(rows)
        return result_df
    
    # Chi-square 실행 함수
    def run_chi_square_test_df(df: pd.DataFrame, question_key: str, demo_dict: dict) -> pd.DataFrame:
        question_key = question_key.replace("-", "_").strip()
        if question_key not in [col.replace("-", "_").strip() for col in df.columns]:
            print(f"❌ 질문 항목 '{question_key}' 이(가) 데이터에 존재하지 않습니다.")
            return pd.DataFrame([])

        rows = []

        for demo_col, label in demo_dict.items():
            if demo_col not in df.columns:
                print(f"❌ DEMO 컬럼 누락: {demo_col}")
                continue

            try:
                normalized_columns = {col.replace("-", "_").strip(): col for col in df.columns}
                contingency_table = pd.crosstab(df[demo_col], df[normalized_columns[question_key]])

                if contingency_table.shape[0] < 2 or contingency_table.shape[1] < 2:
                    print(f"⚠️ 스킵됨: {label} - 교차표 크기 부족")
                    continue

                chi2, p, dof, expected = stats.chi2_contingency(contingency_table)

                row = {
                    "대분류": label,
                    "통계량": round(chi2, 3),
                    "p-value": round(p, 4),
                    "유의성": assign_significance_stars(p)
                }
                rows.append(row)

            except Exception as e:
                print(f"❌ Chi-square 실패: {label} / {str(e)}")
                continue

        return pd.DataFrame(rows)
    
    # ✅ 임의(수기) 분석 함수
    def run_manual_analysis(df: pd.DataFrame, question_key: str, demo_dict: dict) -> pd.DataFrame:
        question_key = question_key.replace("-", "_").strip()
        if question_key not in df.columns:
            print(f"❌ 질문 항목 '{question_key}' 이(가) 데이터에 존재하지 않습니다.")
            return pd.DataFrame([])

        try:
            # 전체 값 및 신뢰구간 계산
            overall_row = df[df["대분류"].astype(str).str.strip() == "전 체"]
            if overall_row.empty:
                print("❌ '전 체' 대분류 행이 존재하지 않습니다.")
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

            return pd.DataFrame(rows)
        except Exception as e:
            print(f"❌ 임의 분석 중 오류 발생: {e}")
            return pd.DataFrame([])
    
    if test_type == "ft_test":
        return run_ft_test_df(df, question_key, demo_dict)
    elif test_type =="chi_square":
        return run_chi_square_test_df(df, question_key, demo_dict)
    elif test_type == "manual":
        return run_manual_analysis(df, question_key, demo_dict)
    else:
        raise ValueError(f"❌ 잘못된 test_type: {test_type}")

@app.route('/api/statistical-tests', methods=['POST'])
def run_statistical_tests_api():
    """통계 검정 API 엔드포인트"""
    try:
        print("🔍 FormData 요청 받음")
        
        # FormData에서 데이터 추출
        test_type = request.form.get('test_type')  # 'ft_test', 'chi_square', 'manual'
        question_key = request.form.get('question_key')
        uploaded_file = request.files.get('file')
        
        print(f"🔍 파싱된 데이터:")
        print(f"  - test_type: {test_type}")
        print(f"  - question_key: {question_key}")
        print(f"  - uploaded_file: {uploaded_file.filename if uploaded_file else None}")
        
        # 파일 데이터 읽기
        if uploaded_file:
            # Streamlit 방식으로 파일 직접 읽기
            print("🔍 Streamlit 방식으로 파일 읽기 시작...")
            raw_data = pd.read_excel(uploaded_file, sheet_name="DATA")
            print(f"🔍 DATA 시트 읽기 완료: {raw_data.shape}")
            
            # DEMO 시트 읽기
            uploaded_file.seek(0)  # 파일 포인터 리셋
            demo_df = pd.read_excel(uploaded_file, sheet_name="DEMO")
            print(f"🔍 DEMO 시트 읽기 완료: {demo_df.shape}")
            
            # ✅ 컬럼명 정규화: '-' → '_', 그리고 양쪽 공백 제거
            raw_data.columns = [col.replace("-", "_").strip() for col in raw_data.columns]

            demo_mapping = extract_demo_mapping_from_dataframe(demo_df)
            print(f"🔍 DEMO 매핑: {demo_mapping}")

            result_df = run_statistical_tests(test_type=test_type,
                                            df=raw_data,
                                            question_key=question_key,
                                            demo_dict=demo_mapping)
            
            # DataFrame을 딕셔너리 리스트로 변환
            results = result_df.to_dict('records')
            print(f"🔍 통계 검정 결과: {results}")
            
            # 자연어 요약 생성
            summary_text = summarize_ft_test(result_df, lang="한국어")
            print(f"🔍 자연어 요약: {summary_text}")
            
            response_data = {
                "success": True,
                "results": results,
                "test_type": test_type,
                "summary": summary_text
            }
            
            print(f"🔍 응답 데이터: {response_data}")
            return jsonify(response_data)
        else:
            return jsonify({"error": "❌ 파일이 업로드되지 않았습니다."}), 400
        
    except Exception as e:
        print(f"❌ 통계 검정 중 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"❌ 통계 검정 중 오류 발생: {str(e)}"}), 500

import os

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5001))
    app.run(host='0.0.0.0', port=port, debug=True)