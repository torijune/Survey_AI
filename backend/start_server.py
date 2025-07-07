#!/usr/bin/env python3
"""
Survey AI Python Backend Server
"""

import uvicorn
import os
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv()

if __name__ == "__main__":
    # 서버 설정
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    
    print(f"🚀 Starting Survey AI Backend Server...")
    print(f"📍 Host: {host}")
    print(f"🔌 Port: {port}")
    print(f"🌐 URL: http://{host}:{port}")
    print(f"📊 Health Check: http://{host}:{port}/health")
    
    # 서버 시작
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,  # 개발 모드에서 자동 리로드
        log_level="info"
    ) 