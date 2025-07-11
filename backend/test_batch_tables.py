#!/usr/bin/env python3
"""
배치 분석 테이블 존재 여부 확인 스크립트
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.supabase_client import get_supabase

def test_batch_tables():
    """배치 분석 테이블 존재 여부 확인"""
    try:
        supabase = get_supabase()
        
        # 테이블 존재 여부 확인
        print("배치 분석 테이블 존재 여부 확인 중...")
        
        # batch_analysis_jobs 테이블 확인
        try:
            result = supabase.table("batch_analysis_jobs").select("id").limit(1).execute()
            print("✅ batch_analysis_jobs 테이블이 존재합니다.")
        except Exception as e:
            print(f"❌ batch_analysis_jobs 테이블이 존재하지 않습니다: {e}")
        
        # batch_analysis_results 테이블 확인
        try:
            result = supabase.table("batch_analysis_results").select("id").limit(1).execute()
            print("✅ batch_analysis_results 테이블이 존재합니다.")
        except Exception as e:
            print(f"❌ batch_analysis_results 테이블이 존재하지 않습니다: {e}")
        
        # batch_analysis_logs 테이블 확인
        try:
            result = supabase.table("batch_analysis_logs").select("id").limit(1).execute()
            print("✅ batch_analysis_logs 테이블이 존재합니다.")
        except Exception as e:
            print(f"❌ batch_analysis_logs 테이블이 존재하지 않습니다: {e}")
        
        # 테이블 스키마 확인
        print("\n테이블 스키마 확인 중...")
        
        # batch_analysis_results 스키마 확인
        try:
            result = supabase.table("batch_analysis_results").select("*").limit(0).execute()
            print("✅ batch_analysis_results 테이블에 접근할 수 있습니다.")
        except Exception as e:
            print(f"❌ batch_analysis_results 테이블 접근 오류: {e}")
        
    except Exception as e:
        print(f"❌ Supabase 연결 오류: {e}")

if __name__ == "__main__":
    test_batch_tables() 