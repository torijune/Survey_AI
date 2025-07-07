#!/bin/bash

# stop-dev.sh: dev.sh로 실행한 개발 서버 종료

if [ -f .frontend.pid ]; then
  FRONT_PID=$(cat .frontend.pid)
  if kill -0 $FRONT_PID 2>/dev/null; then
    kill $FRONT_PID
    echo "[stop-dev.sh] 프론트엔드(Next.js) 종료: PID $FRONT_PID"
  fi
  rm -f .frontend.pid
else
  echo "[stop-dev.sh] .frontend.pid 파일이 없습니다. 이미 종료되었거나 실행 중이 아닙니다."
fi

if [ -f .backend.pid ]; then
  BACK_PID=$(cat .backend.pid)
  if kill -0 $BACK_PID 2>/dev/null; then
    kill $BACK_PID
    echo "[stop-dev.sh] 백엔드(FastAPI) 종료: PID $BACK_PID"
  fi
  rm -f .backend.pid
else
  echo "[stop-dev.sh] .backend.pid 파일이 없습니다. 이미 종료되었거나 실행 중이 아닙니다."
fi

echo "[stop-dev.sh] 모든 개발 서버 종료 완료." 