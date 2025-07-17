from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

# Feature-Sliced Clean Architecture API 라우터 임포트
from app.planner.api.router import router as planner_router
from app.single_analysis.api.router import router as single_analysis_router
from app.fgi.api.router import router as fgi_router
from app.batch_analysis.api.router import router as batch_analysis_router
from app.visualization.api.router import router as visualization_router
from app.fgi.api.ws_router import ws_router as fgi_ws_router
from app.planner.api.ws_router import ws_router as planner_ws_router


app = FastAPI(title="Survey AI Backend", version="1.0.0")
# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Feature-Sliced Clean Architecture API 라우터 등록
## planner: /api/planner/create, 
app.include_router(planner_router, prefix="/api/planner")
app.include_router(single_analysis_router, prefix="/api/single-analysis")
app.include_router(fgi_router, prefix="/api/fgi")
app.include_router(batch_analysis_router, prefix="/api/batch-analysis")
app.include_router(visualization_router, prefix="/api/visualization")
# WebSocket 라우터는 prefix 없이 등록
app.include_router(fgi_ws_router)
app.include_router(planner_ws_router)

@app.get("/")
async def root():
    return {"message": "Survey AI Backend API - Feature-Sliced Clean Architecture"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "architecture": "feature-sliced-clean-architecture"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 