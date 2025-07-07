#!/bin/bash

# 프로젝트 루트 디렉토리로 이동
cd "$(dirname "$0")"

# 백엔드 디렉토리로 이동
cd backend

# PID 파일이 존재하는지 확인
if [ -f backend.pid ]; then
    PID=$(cat backend.pid)
    echo "백엔드 서버를 종료합니다. PID: $PID"
    
    # 프로세스 종료
    kill $PID 2>/dev/null
    
    # 강제 종료 (필요시)
    sleep 3
    if kill -0 $PID 2>/dev/null; then
        echo "강제 종료합니다..."
        kill -9 $PID
    fi
    
    # PID 파일 삭제
    rm -f backend.pid
    echo "백엔드 서버가 종료되었습니다."
else
    echo "백엔드 서버가 실행 중이지 않습니다."
fi 