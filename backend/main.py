from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import asyncio
import json
from typing import Optional, Dict, Any, List
import os
from dotenv import load_dotenv
try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = None
try:
    import openai
except ImportError:
    openai = None
import numpy as np

# 워크플로우 임포트
from workflows.langgraph_workflow import LangGraphWorkflow
from workflows.fgi_workflow import FGIWorkflow
from workflows.planner_workflow import PlannerWorkflow
from workflows.visualization_workflow import VisualizationWorkflow
from utils.openai_client import OpenAIClient
from utils.data_processor import DataProcessor

load_dotenv()

app = FastAPI(title="Survey AI Backend", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 워크플로우 인스턴스
langgraph_workflow = LangGraphWorkflow()
fgi_workflow = FGIWorkflow()
planner_workflow = PlannerWorkflow()
visualization_workflow = VisualizationWorkflow()
openai_client = OpenAIClient()
data_processor = DataProcessor()

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if create_client else None
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBEDDING_MODEL = "text-embedding-3-small"
LLM_MODEL = "gpt-4o-mini"

async def get_embedding(text: str):
    if not openai:
        raise Exception("openai 패키지가 설치되어 있지 않습니다. 'pip install openai'로 설치하세요.")
    response = await openai.AsyncOpenAI(api_key=OPENAI_API_KEY).embeddings.create(
        input=text,
        model=EMBEDDING_MODEL
    )
    return response.data[0].embedding

@app.get("/")
async def root():
    return {"message": "Survey AI Backend API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# table-analysis page langgraph logic
@app.post("/api/langgraph")
async def langgraph_analysis(
    file: UploadFile = File(...),
    analysis_type: bool = Form(True),
    selected_key: str = Form(""),
    lang: str = Form("한국어"),
    user_id: Optional[str] = Form(None)
):
    """LangGraph 워크플로우 실행"""
    try:
        # 파일 읽기
        file_content = await file.read()
        
        # 옵션 설정
        options = {
            "analysis_type": analysis_type,
            "selected_key": selected_key,
            "lang": lang,
            "user_id": user_id
        }
        
        # 워크플로우 실행
        result = await langgraph_workflow.execute(
            file_content=file_content,
            file_name=file.filename,
            options=options
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# fgi-analysis 문서 요약 방법 logic
@app.post("/api/fgi")
async def fgi_analysis(
    file: UploadFile = File(...),
    user_id: Optional[str] = Form(None)
):
    """FGI 워크플로우 실행"""
    try:
        # 메인 파일 읽기
        file_content = await file.read()
        
        # 옵션 설정
        options = {
            "user_id": user_id
        }
        
        # 워크플로우 실행
        result = await fgi_workflow.execute(
            file_content=file_content,
            file_name=file.filename,
            options=options
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# openai-call logic
@app.post("/api/openai")
async def openai_call(
    messages: str = Form(...),
    model: str = Form("gpt-4o-mini"),
    temperature: float = Form(0.3)
):
    """OpenAI API 호출"""
    try:
        # JSON 문자열을 파싱
        messages_list = json.loads(messages)
        
        # OpenAI 호출
        response = await openai_client.call(
            messages=messages_list,
            model=model,
            temperature=temperature
        )
        
        return {"choices": [{"message": {"content": response}}]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# table-analysis page statistical-tests logic
@app.post("/api/statistical-tests")
async def statistical_tests(
    test_type: str = Form(...),
    file: UploadFile = File(...),
    question_key: str = Form(...)
):
    """통계 검정 실행"""
    try:
        # 파일 읽기
        file_content = await file.read()
        
        # 데이터 처리
        df = data_processor.process_excel_file(file_content)
        
        # 통계 검정 실행
        results = await data_processor.run_statistical_tests(
            test_type=test_type,
            df=df,
            question_key=question_key
        )
        
        return {"success": True, "results": results}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# table-analysis page logic
@app.post("/api/table-analysis")
async def table_analysis(
    file: UploadFile = File(...),
    analysis_type: str = Form("manual"),
    selected_key: str = Form("")
):
    """테이블 분석"""
    try:
        # 파일 읽기
        file_content = await file.read()
        
        # 데이터 처리
        tables = data_processor.extract_tables_from_excel(file_content)
        
        # 개별 table 분석
        if analysis_type == "manual" and selected_key:
            # 특정 테이블 분석
            if selected_key in tables:
                table_data = tables[selected_key]
                analysis = await data_processor.analyze_table(table_data)
                return {
                    "success": True,
                    "analysis": analysis,
                    "selected_key": selected_key
                }
            else:
                raise HTTPException(status_code=400, detail=f"선택된 키 '{selected_key}'를 찾을 수 없습니다.")
        # 전체 table 분석
        else:
            # 모든 테이블 분석
            all_analyses = {}
            for key, table_data in tables.items():
                analysis = await data_processor.analyze_table(table_data)
                all_analyses[key] = analysis
            
            return {
                "success": True,
                "analyses": all_analyses
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# survey-planner page logic
@app.post("/api/planner")
async def planner_workflow_endpoint(
    topic: str = Form(...),
    objective: str = Form(...),
    lang: str = Form("한국어"),
    user_id: Optional[str] = Form(None)
):
    """설문 계획 워크플로우 실행"""
    try:
        # 옵션 설정
        options = {
            "user_id": user_id
        }
        
        # 워크플로우 실행
        result = await planner_workflow.execute(
            topic=topic,
            objective=objective,
            lang=lang,
            on_step=options.get("on_step")
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/visualization")
async def visualization_workflow_endpoint(
    file: UploadFile = File(...),
    selected_key: str = Form(""),
    user_id: Optional[str] = Form(None)
):
    """시각화 워크플로우 실행"""
    try:
        # 파일 읽기
        file_content = await file.read()
        
        # 옵션 설정
        options = {
            "selected_key": selected_key,
            "user_id": user_id
        }
        
        # 워크플로우 실행
        result = await visualization_workflow.execute(
            file_content=file_content,
            file_name=file.filename,
            options=options
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/docx-to-text")
async def docx_to_text(file: UploadFile = File(...)):
    """DOCX 파일에서 텍스트 추출"""
    try:
        # 파일 읽기
        file_content = await file.read()
        
        # FGI 워크플로우의 텍스트 추출 함수 사용
        text = await fgi_workflow.extract_text_from_docx(file_content)
        
        return {"text": text}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/guide-topics")
async def guide_topics(file: UploadFile = File(...)):
    try:
        file_content = await file.read()
        topics = await fgi_workflow.LLM_extract_guide_subjects_from_text(file_content)
        return {"topics": topics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/fgi-topic-analysis")
async def fgi_topic_analysis(
    file_id: str = Form(...),
    topics: str = Form(...),
    user_id: str = Form(None)
):
    if not supabase:
        raise HTTPException(status_code=500, detail="supabase-py 패키지가 설치되어 있지 않습니다. 'pip install supabase'로 설치하세요.")
    try:
        topic_list = json.loads(topics)
        results = []
        for topic in topic_list:
            topic_embedding = await get_embedding(topic)
            rpc_res = supabase.rpc("match_fgi_doc_embeddings", {
                "query_embedding": topic_embedding,
                "match_count": 5,
                "p_user_id": user_id,
                "p_file_id": file_id
            }).execute()
            if hasattr(rpc_res, 'error') and rpc_res.error:
                raise Exception(f"Supabase RPC error: {rpc_res.error}")
            chunks = rpc_res.data if hasattr(rpc_res, 'data') else []
            top_chunks = [c["chunk_text"] for c in chunks]
            context = "\n---\n".join(top_chunks)
            messages = [
                {"role": "system", "content": "FGI 회의록 기반 전문가. context에 없는 내용은 모른다고 답해."},
                {"role": "user", "content": f"context:\n{context}\n\n질문: {topic}\n\n답변:"}
            ]
            answer = await fgi_workflow.make_openai_call(messages)
            results.append({"topic": topic, "result": answer})
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 