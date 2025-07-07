#!/bin/bash

# dev.sh: 프론트엔드(Next.js)와 백엔드(FastAPI) 개발 서버를 동시에 실행
# 로그: frontend.log, backend.log / PID: .frontend.pid, .backend.pid

# 1. 프론트엔드 실행
cd frontend
if [ ! -d "node_modules" ]; then
  echo "[dev.sh] npm install (frontend)"
  npm install
fi
nohup npm run dev > ../frontend.log 2>&1 &
FRONT_PID=$!
echo $FRONT_PID > ../.frontend.pid
cd ..
echo "[dev.sh] Frontend(Next.js) started. PID: $FRONT_PID"

# 2. 백엔드 실행
cd backend
if [ ! -d "venv" ]; then
  echo "[dev.sh] Python venv가 없습니다. python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt 를 먼저 실행하세요."
  exit 1
fi

# 환경 변수 설정 (backend/.env에서 가져오기)
if [ -f ".env" ]; then
  echo "[dev.sh] Backend 환경 변수를 적용합니다."
  export $(grep -v '^#' .env | xargs)
fi

source venv/bin/activate
nohup python3 main.py > ../backend.log 2>&1 &
BACK_PID=$!
echo $BACK_PID > ../.backend.pid
deactivate
cd ..
echo "[dev.sh] Backend(FastAPI) started. PID: $BACK_PID"

echo "[dev.sh] 개발 서버가 모두 실행되었습니다."
echo "  - 프론트엔드: http://localhost:3000 (또는 3001, 3002)"
echo "  - 백엔드: http://localhost:8000"
echo "로그: frontend.log, backend.log"
echo "종료: ./stop-dev.sh 실행" 