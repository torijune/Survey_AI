#!/bin/bash

# Python 가상환경 생성 (없는 경우)
if [ ! -d "venv" ]; then
    echo "Python 가상환경을 생성합니다..."
    python3 -m venv venv
fi

# 가상환경 활성화
echo "가상환경을 활성화합니다..."
source venv/bin/activate

# 의존성 설치
echo "의존성을 설치합니다..."
pip install -r requirements.txt

# Python API 서버 시작
echo "Python 통계 검정 API 서버를 시작합니다..."
python statistical_tests.py 