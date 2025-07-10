from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import uvicorn
import asyncio
import json
from typing import Optional, Dict, Any, List
import os
from dotenv import load_dotenv
from dotenv import load_dotenv
import os
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
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
from datetime import datetime

# 워크플로우 임포트
from workflows.langgraph_workflow import LangGraphWorkflow
from workflows.fgi_workflow import FGIWorkflow
from workflows.planner_workflow import PlannerWorkflow
from workflows.visualization_workflow import VisualizationWorkflow

# Clean Architecture 임포트
from app.domain.planner.use_cases import CreateSurveyPlanUseCase
from app.domain.planner.services import PlannerService
from app.infrastructure.openai.client import OpenAIClient as CleanOpenAIClient

# Clean Architecture API 라우터 임포트
from app.api.v1.planner.router import router as planner_router
from app.api.v1.table_analysis.router import router as table_analysis_router
from app.api.v1.fgi.router import router as fgi_router
from utils.openai_client import OpenAIClient
from utils.data_processor import DataProcessor
from utils.supabase_client import get_supabase
import uuid
from app.api.v1.fgi.ws_router import ws_router

app = FastAPI(title="Survey AI Backend", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Clean Architecture API 라우터 등록
app.include_router(planner_router, prefix="/api/v1")
app.include_router(table_analysis_router, prefix="/api/v1")
app.include_router(fgi_router, prefix="/api/v1")
app.include_router(ws_router)

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

# fgi-analysis 문서 요약 방법 logic (기존 호환성 유지)
@app.post("/api/fgi")
async def fgi_analysis(
    file: UploadFile = File(...),
    user_id: Optional[str] = Form(None)
):
    """FGI 워크플로우 실행 (기존 호환성)"""
    try:
        # 메인 파일 읽기
        file_content = await file.read()
        
        # 옵션 설정
        options = {
            "user_id": user_id
        }
        
        # 워크플로우 실행 (기존 방식 유지)
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

# survey-planner page logic (Clean Architecture)
@app.post("/api/planner")
async def planner_workflow_endpoint(
    topic: str = Form(...),
    objective: str = Form(...),
    lang: str = Form("한국어"),
    user_id: Optional[str] = Form(None)
):
    """설문 계획 워크플로우 실행 (Clean Architecture)"""
    try:
        # Clean Architecture 의존성 주입
        openai_client = CleanOpenAIClient()
        planner_service = PlannerService(openai_client)
        use_case = CreateSurveyPlanUseCase(planner_service)
        
        # 유스케이스 실행
        result = await use_case.execute(
            topic=topic,
            objective=objective,
            lang=lang
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def clean_json(obj):
    if isinstance(obj, float):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return obj
    elif isinstance(obj, list):
        return [clean_json(x) for x in obj]
    elif isinstance(obj, dict):
        return {k: clean_json(v) for k, v in obj.items()}
    else:
        return obj

@app.post("/api/visualization")
async def visualization_workflow_endpoint(
    file: UploadFile = File(...),
    selected_key: str = Form(""),
    user_id: Optional[str] = Form(None)
):
    """시각화용 테이블 데이터만 반환 (프론트에서 시각화)"""
    try:
        # 파일 읽기
        file_content = await file.read()

        # 테이블 파싱만 수행
        survey_data = await visualization_workflow.load_survey_tables(file_content, file.filename)
        tables = {}
        for key in survey_data["question_keys"]:
            table = survey_data["tables"][key]
            # If table is a DataFrame, convert to dict
            if hasattr(table, "to_dict"):
                columns = list(table.columns)
                data = table.replace([np.inf, -np.inf], np.nan).fillna(np.nan).values.tolist()
                question_text = survey_data["question_texts"].get(key, "")
                question_key = key
            else:
                columns = table.columns if hasattr(table, "columns") else []
                data = table.data if hasattr(table, "data") else []
                question_text = getattr(table, "question_text", "")
                question_key = getattr(table, "question_key", key)
            tables[key] = {
                "columns": columns,
                "data": clean_json(data),
                "question_text": question_text,
                "question_key": question_key
            }
        return clean_json({
            "success": True,
            "tables": tables,
            "question_keys": survey_data["question_keys"],
            "question_texts": survey_data["question_texts"]
        })
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
    """가이드 주제 추출 (기존 호환성)"""
    try:
        file_content = await file.read()
        topics = await fgi_workflow.LLM_extract_guide_subjects_from_text(file_content)
        return {"topics": topics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# fgi-analysis page topic-analysis logic
@app.post("/api/fgi-topic-analysis")
async def fgi_topic_analysis(
    file_id: str = Form(...),
    topics: str = Form(...),
    user_id: str = Form(None),
    analysis_tone: str = Form("설명 중심")
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

            # 분석 분위기별 프롬프트 분기
            ## 키워드별 분석 프롬프트
            if analysis_tone == "키워드 중심":
                user_prompt = f"""회의 내용:\n{context}\n\n질문: 회의에서 '{topic}'에 대해 논의된 주요 키워드, 참여자들이 제시한 핵심 주제, 의견을 간략하게 키워드/주제 위주로 정리해줘. 
                아래의 출력 예시를 참고해서 출력해줘.
                출력 예시: 
                {topic}에 대한 주요 키워드 및 주제는 아래와 같습니다.
                1. 키워드1: \n 1-1. 키워드1에 대한 간략한 설명
                2. 키워드2: \n 2-1. 키워드2에 대한 간략한 설명
                3. 키워드3: \n 3-1. 키워드3에 대한 간략한 설명
                ...
                \n\n답변:
                """
            ## 자연어 설명 중심 분석 프롬프트
            else: 
                user_prompt = f"회의 내용:\n{context}\n\n질문: 회의에서 '{topic}'에 대해 참여자들이 어떤 의견을 제시하고 논의했는지 자연어로 키워드 및 중심 주제들에 대해서 요약 및 설명해줘.\n\n답변:"

            # 프롬프트 콘솔 출력
            print(f"[LLM 프롬프트][{analysis_tone}] {topic}\n---\n{user_prompt}\n---")

            messages = [
                {"role": "system", "content": "FGI 회의록 기반 전문가. context에 없는 내용은 모른다고 답해."},
                {"role": "user", "content": user_prompt}
            ]
            answer = await fgi_workflow.make_openai_call(messages)
            results.append({"topic": topic, "result": answer})

        # 결과 DB 저장
        try:
            if supabase:
                supabase.table('fgi_topic_analyses').insert({
                    "user_id": user_id,
                    "fgi_file_id": file_id,
                    "topics": topic_list,
                    "results": results,
                    "analysis_tone": analysis_tone
                }).execute()
        except Exception as db_e:
            print(f"[DB][fgi_topic_analyses] 저장 실패: {db_e}")
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# table-analysis page logic
@app.post("/api/table-parse")
async def table_parse(
    file: UploadFile = File(...),
    selected_key: str = Form("")
):
    """테이블 파싱만 수행"""
    try:
        file_content = await file.read()
        parsed = data_processor.load_survey_tables(file_content, file.filename)
        
        # DataFrame -> list 변환
        tables = {}
        for key, df in parsed["tables"].items():
            tables[key] = {
                "columns": list(df.columns),
                "data": df.replace([np.inf, -np.inf], np.nan).fillna(np.nan).values.tolist()
            }
        
        return clean_json({
            "success": True,
            "tables": tables,
            "question_texts": parsed["question_texts"],
            "question_keys": parsed["question_keys"]
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/table-analyze")
async def table_analyze(
    file: UploadFile = File(...),
    raw_data_file: UploadFile = File(None),
    selected_key: str = Form(""),
    lang: str = Form("한국어"),
    user_id: Optional[str] = Form(None),
    analysis_type: str = Form("analyze"),
    batch_test_types: str = Form(None)
):
    """테이블 AI 분석 수행 (단일/전체/추천)"""
    try:
        file_content = await file.read()
        raw_data_content = await raw_data_file.read() if raw_data_file else None
        # 1. test_type 추천만 요청
        if analysis_type == "recommend_test_types":
            print("[DEBUG] recommend_test_types 분기 진입")
            # 엑셀 파싱
            parsed = await langgraph_workflow.load_survey_tables(file_content, file.filename)
            question_keys = parsed["question_keys"]
            question_texts = parsed["question_texts"]
            tables = parsed["tables"]
            question_infos = []
            for key in question_keys:
                table = tables[key]
                columns = list(table.columns) if hasattr(table, 'columns') else []
                question_infos.append({"key": key, "text": question_texts[key], "columns": columns})
            try:
                print("[DEBUG] test_type_map 추천 시도")
                test_type_map = await langgraph_workflow.decide_batch_test_types(question_infos, lang=lang)
                if not test_type_map or not isinstance(test_type_map, dict):
                    # fallback: 모두 ft_test
                    test_type_map = {q["key"]: "오류 발생" for q in question_infos}
                    print(f"[DEBUG] test_type_map: {test_type_map}")
                print("[DEBUG] test_type_map 추천 완료")
            except Exception as e:
                print(f"[recommend_test_types] LLM 추천 실패: {e}")
                test_type_map = {q["key"]: "{e}" for q in question_infos}
            return {
                "success": True,
                "test_type_map": test_type_map,
                "question_keys": question_keys,
                "question_texts": question_texts
            }
        elif analysis_type == "analyze":
            options = {
                "analysis_type": True,
                "selected_key": selected_key,
                "lang": lang,
                "user_id": user_id if user_id is not None else None,
                "raw_data_content": raw_data_content if raw_data_content is not None else None,
                "raw_data_filename": raw_data_file.filename if raw_data_file else None
            }
            # Only pass raw_data_content and raw_data_filename if not None
            execute_kwargs = dict(
                file_content=file_content,
                file_name=file.filename,
                options=options
            )
            if raw_data_content is not None:
                execute_kwargs["raw_data_content"] = raw_data_content
            if raw_data_file and raw_data_file.filename:
                execute_kwargs["raw_data_filename"] = raw_data_file.filename
            result = await langgraph_workflow.execute(**execute_kwargs)
            return JSONResponse(content=clean_json(result))
        elif analysis_type == "batch" and batch_test_types:
            import json
            test_type_map = json.loads(batch_test_types)
            execute_batch_kwargs = dict(
                file_content=file_content,
                file_name=file.filename,
                test_type_map=test_type_map,
                lang=lang,
                user_id=user_id if user_id is not None else None
            )
            if raw_data_content is not None:
                execute_batch_kwargs["raw_data_content"] = raw_data_content
            if raw_data_file and raw_data_file.filename:
                execute_batch_kwargs["raw_data_filename"] = raw_data_file.filename
            result = await langgraph_workflow.execute_batch(**execute_batch_kwargs)
            return {"success": True, "result": result["result"]}
        else:
            raise HTTPException(status_code=400, detail="Invalid analysis_type or missing batch_test_types")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/batch-analyze")
async def batch_analyze(
    file: UploadFile = File(...),
    raw_data_file: UploadFile = File(None),
    lang: str = Form("한국어"),
    user_id: str = Form(...),
    batch_test_types: str = Form(...),
    file_name: str = Form(None)
):
    """Supabase 기반 비동기 전체 분석 시작: job_id 반환, 각 질문별로 DB에 row 생성, 비동기로 분석 시작"""
    try:
        file_content = await file.read()
        raw_data_content = await raw_data_file.read() if raw_data_file else None
        test_type_map = json.loads(batch_test_types)
        supabase = get_supabase()
        # 1. job_id 생성 및 jobs 테이블 row 생성
        job_id = str(uuid.uuid4())
        file_name = file_name or file.filename
        supabase.table("batch_analysis_jobs").insert({
            "id": job_id,
            "user_id": user_id,
            "file_name": file_name,
            "status": "pending"
        }).execute()
        # 2. 테이블 파싱 및 질문 목록 추출
        from workflows.langgraph_workflow import LangGraphWorkflow
        workflow = LangGraphWorkflow()
        parsed = await workflow.load_survey_tables(file_content, file_name)
        question_keys = parsed["question_keys"]
        # 3. 각 질문별로 results row 생성 (status=pending)
        for key in question_keys:
            supabase.table("batch_analysis_results").insert({
                "job_id": job_id,
                "question_key": key,
                "status": "pending"
            }).execute()
        # 4. 비동기 분석 시작 (백그라운드)
        async def analyze_questions():
            for key in question_keys:
                # 이미 완료된 row는 skip (복구 지원)
                res = supabase.table("batch_analysis_results").select("status").eq("job_id", job_id).eq("question_key", key).execute()
                if res.data and res.data[0]["status"] == "done":
                    continue
                # running으로 업데이트
                supabase.table("batch_analysis_results").update({"status": "running"}).eq("job_id", job_id).eq("question_key", key).execute()
                try:
                    # 기존 워크플로우 실행
                    state = await workflow.execute(
                        file_content=file_content,
                        file_name=file_name,
                        options={
                            "analysis_type": False,
                            "selected_key": key,
                            "lang": lang,
                            "user_id": user_id
                        },
                        raw_data_content=raw_data_content,
                        raw_data_filename=raw_data_file.filename if raw_data_file else None
                    )
                    # 결과 저장
                    supabase.table("batch_analysis_results").update({
                        "status": "done",
                        "result": state["result"] if state.get("success") else None,
                        "error": state.get("error")
                    }).eq("job_id", job_id).eq("question_key", key).execute()
                except Exception as e:
                    supabase.table("batch_analysis_results").update({
                        "status": "error",
                        "error": str(e)
                    }).eq("job_id", job_id).eq("question_key", key).execute()
            # 전체 완료 시 jobs 테이블 status 업데이트
            supabase.table("batch_analysis_jobs").update({"status": "done"}).eq("id", job_id).execute()
        asyncio.create_task(analyze_questions())
        return {"success": True, "job_id": job_id}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/batch-status")
async def batch_status(job_id: str):
    """job_id로 각 질문별 status/result/error 반환"""
    try:
        supabase = get_supabase()
        res = supabase.table("batch_analysis_results").select("question_key,status,result,error,updated_at").eq("job_id", job_id).execute()
        return {"success": True, "results": res.data}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/batch-cancel")
async def batch_cancel(job_id: str):
    """job_id로 batch 취소: jobs, 미완료 질문 status를 cancelled로"""
    try:
        supabase = get_supabase()
        supabase.table("batch_analysis_jobs").update({"status": "cancelled"}).eq("id", job_id).execute()
        supabase.table("batch_analysis_results").update({"status": "cancelled"}).eq("job_id", job_id).in_("status", ["pending", "running"]).execute()
        # 로그 기록
        supabase.table("batch_analysis_logs").insert({"job_id": job_id, "event": "cancel", "timestamp": datetime.utcnow().isoformat()}).execute()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/batch-restart")
async def batch_restart(job_id: str):
    """job_id의 미완료 질문만 이어서 재분석"""
    try:
        supabase = get_supabase()
        # job 정보/파일명/유저 등 조회
        job = supabase.table("batch_analysis_jobs").select("file_name,user_id").eq("id", job_id).single().execute().data
        if not job:
            return {"success": False, "error": "job_id not found"}
        file_name = job["file_name"]
        user_id = job["user_id"]
        # 미완료 질문 조회
        res = supabase.table("batch_analysis_results").select("question_key").eq("job_id", job_id).in_("status", ["pending", "running", "error", "cancelled"]).execute()
        question_keys = [r["question_key"] for r in res.data]
        # 파일은 별도 저장소에서 불러와야 함(여기선 생략, 실제 서비스에선 파일 저장 필요)
        # 로그 기록
        supabase.table("batch_analysis_logs").insert({"job_id": job_id, "event": "restart", "timestamp": datetime.utcnow().isoformat()}).execute()
        # 실제 재분석은 기존 batch_analyze의 analyze_questions와 유사하게 구현 필요(여기선 생략)
        return {"success": True, "message": "재분석이 시작되었습니다. (실제 파일 불러오기/분석 로직 필요)"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/batch-log")
async def batch_log(job_id: str):
    """job_id별 로그 반환"""
    try:
        supabase = get_supabase()
        logs = supabase.table("batch_analysis_logs").select("event,timestamp").eq("job_id", job_id).order("timestamp").execute().data
        return {"success": True, "logs": logs}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/batch-log")
async def batch_log_post(job_id: str, event: str):
    """로그 기록"""
    try:
        supabase = get_supabase()
        supabase.table("batch_analysis_logs").insert({"job_id": job_id, "event": event, "timestamp": datetime.utcnow().isoformat()}).execute()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/batch-download")
async def batch_download(job_id: str):
    """job_id별 전체 결과 JSON 다운로드"""
    try:
        supabase = get_supabase()
        res = supabase.table("batch_analysis_results").select("question_key,result,status,error").eq("job_id", job_id).execute()
        import io, json
        buf = io.BytesIO(json.dumps(res.data, ensure_ascii=False, indent=2).encode("utf-8"))
        return StreamingResponse(buf, media_type="application/json", headers={"Content-Disposition": f"attachment; filename=batch_{job_id}_results.json"})
    except Exception as e:
        return JSONResponse(content={"success": False, "error": str(e)}, status_code=500)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 