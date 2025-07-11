#!/usr/bin/env python3
"""
Manual 분석 함수 테스트 스크립트
"""

import pandas as pd
import numpy as np
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def create_test_data():
    data = {
        "대분류": [
            "전 체", "기업규모", "기업규모", "산업분야", "산업분야", "산업분야", "산업분야",
            "연구소/생산시설 보유", "연구소/생산시설 보유", "연구소/생산시설 보유"
        ],
        "소분류": [
            "", "대기업/중견기업", "소기업/스타트업", "바이오의약", "디지털헬스", "진단기기/유전자치료", "기타",
            "본사만 있다", "본사+연구소", "본사+생산시설"
        ],
        "사례수": [182, 21, 161, 71, 57, 32, 22, 65, 60, 30],
        "자가": [31.9, 71.4, 26.7, 35.2, 28.1, 28.1, 36.4, 32.3, 16.7, 43.3],
        "임대": [68.1, 28.6, 73.3, 64.8, 71.9, 71.9, 63.6, 67.7, 83.3, 56.7]
    }
    return pd.DataFrame(data)

def test_manual_analysis():
    """Manual 분석 함수 테스트"""
    try:
        from app.domain.table_analysis.services import TableAnalysisService
        from app.infrastructure.openai.client import OpenAIClient
        from app.infrastructure.file.excel_loader import ExcelLoader
        from app.infrastructure.statistics.statistical_tester import StatisticalTester
        
        # 서비스 인스턴스 생성
        openai_client = OpenAIClient()
        excel_loader = ExcelLoader()
        statistical_tester = StatisticalTester()
        service = TableAnalysisService(openai_client, excel_loader, statistical_tester)
        
        # 테스트 데이터 생성
        test_df = create_test_data()
        print("테스트 데이터:")
        print(test_df)
        print()
        
        # Manual 분석 실행
        print("Manual 분석 실행 중...")
        result_df = service.run_manual_analysis_from_table(test_df)
        
        print("분석 결과:")
        print(result_df)
        print()
        
        # 요약 생성
        summary = service.summarize_manual_analysis(result_df, lang="한국어")
        print("분석 요약:")
        print(summary)
        
        return True
        
    except Exception as e:
        print(f"테스트 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Manual 분석 함수 테스트 시작...")
    success = test_manual_analysis()
    if success:
        print("✅ 테스트 성공!")
    else:
        print("❌ 테스트 실패!") 