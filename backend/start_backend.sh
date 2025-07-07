#!/bin/bash

# 프로젝트 루트 디렉토리로 이동
cd "$(dirname "$0")"

# 백엔드 디렉토리로 이동
cd backend

# 가상환경 활성화
source venv/bin/activate

# 포트 8000이 사용 중인지 확인
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "포트 8000이 이미 사용 중입니다. 기존 프로세스를 종료합니다."
    pkill -f "python.*main.py"
    sleep 2
fi

# 백엔드 서버를 백그라운드에서 실행
echo "Python 백엔드 서버를 시작합니다..."
nohup python main.py > backend.log 2>&1 &

# 프로세스 ID 저장
echo $! > backend.pid
echo "백엔드 서버가 시작되었습니다. PID: $(cat backend.pid)"
echo "로그 확인: tail -f backend/backend.log" 