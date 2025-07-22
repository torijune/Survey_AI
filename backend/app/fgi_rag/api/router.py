from fastapi import APIRouter, Form, HTTPException, UploadFile, File, Request, Body
from typing import List, Optional
from app.fgi_rag.application.workflow import FGIRagWorkflow
from app.fgi_rag.infra.supabase_client import get_supabase
from app.fgi.infra.openai_client import OpenAIClient
import docx
import uuid

router = APIRouter(prefix="", tags=["FGI RAG"])

# 의존성 주입 함수
def get_fgi_rag_workflow():
    supabase = get_supabase()
    llm_client = OpenAIClient()
    return FGIRagWorkflow(supabase, llm_client)

@router.post("/upload")
async def upload_fgi_doc(
    document: UploadFile = File(...),
    user_id: str = Form(...),
    file_id: str = Form(...)
):
    """FGI 문서 임베딩 업로드 (중복 방지, 기존 임베딩 청크 반환)"""
    supabase = get_supabase()
    file_name = document.filename
    # 1. 이미 임베딩된 파일인지 확인
    existing = supabase.table('fgi_doc_embeddings').select('file_id').eq('user_id', user_id).eq('file_name', file_name).limit(1).execute()
    if existing.data and len(existing.data) > 0:
        file_id_existing = existing.data[0]["file_id"]
        # 해당 file_id의 모든 청크 반환
        chunks_res = supabase.table('fgi_doc_embeddings').select('chunk_index', 'chunk_text').eq('file_id', file_id_existing).order('chunk_index').execute()
        chunks = chunks_res.data if chunks_res.data else []
        return {"alreadyExists": True, "file_id": file_id_existing, "chunks": chunks}
    # 2. 파일 파싱
    import os
    import tempfile
    import aiofiles
    import docx
    text = ""
    if document.content_type == 'text/plain':
        contents = await document.read()
        text = contents.decode('utf-8')
    elif document.content_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        # 임시 파일로 저장 후 python-docx로 파싱
        with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp:
            contents = await document.read()
            tmp.write(contents)
            tmp_path = tmp.name
        doc = docx.Document(tmp_path)
        text = '\n'.join([p.text for p in doc.paragraphs])
        os.remove(tmp_path)
    else:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 파일 타입: {document.content_type}")
    if not text or len(text) < 10:
        raise HTTPException(status_code=400, detail="텍스트 추출 실패 또는 너무 짧음")
    # 3. 청크 분할 (간단하게 줄 단위)
    chunks = [text[i:i+800] for i in range(0, len(text), 800)]
    # 4. 임베딩 생성 및 DB 저장
    llm_client = OpenAIClient()
    for i, chunk in enumerate(chunks):
        embedding = await llm_client.get_embedding(chunk)
        supabase.table('fgi_doc_embeddings').insert({
            'user_id': user_id,
            'file_id': file_id,
            'file_name': file_name,
            'chunk_index': i,
            'chunk_text': chunk,
            'embedding': embedding
        }).execute()
    # 새로 생성한 경우도 바로 청크 반환
    return {"ok": True, "file_id": file_id, "chunks": [{"chunk_index": i, "chunk_text": chunk} for i, chunk in enumerate(chunks)]}

@router.post("/analyze")
async def analyze_fgi_rag(
    file_id: str = Form(...),
    topics: str = Form(...),  # JSON string
    user_id: Optional[str] = Form(None),
    analysis_tone: str = Form("설명 중심")
):
    """FGI RAG 주제별 분석"""
    import json
    try:
        workflow = get_fgi_rag_workflow()
        topic_list = json.loads(topics)
        query_dict = {
            "file_id": file_id,
            "topics": topic_list,
            "user_id": user_id,
            "analysis_tone": analysis_tone
        }
        result = await workflow.execute(query_dict)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-subject-analysis")
async def save_subject_analysis(request: Request):
    import json
    import uuid
    from datetime import datetime
    supabase = get_supabase()
    try:
        form = await request.form()
        data = {k: form.get(k) for k in form.keys()}
        print("Received data:", data)
        user_id = data.get("user_id")
        guide_file_name = data.get("guide_file_name")
        fgi_file_id = data.get("fgi_file_id")
        fgi_file_name = data.get("fgi_file_name")
        topics = data.get("topics")
        results = data.get("results")
        title = data.get("title")
        description = data.get("description")
        group_name = data.get("group_name")
        topics_val = topics if isinstance(topics, (list, dict)) else json.loads(topics) if topics else []
        results_val = results if isinstance(results, (list, dict)) else json.loads(results) if results else []
        row = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "guide_file_name": guide_file_name,
            "fgi_file_id": fgi_file_id,
            "fgi_file_name": fgi_file_name,
            "topics": topics_val,
            "results": results_val,
            "title": title,
            "description": description,
            "group_name": group_name,
            "created_at": datetime.utcnow().isoformat()
        }
        print("Saving FGI subject analysis row:", row)
        res = supabase.table('fgi_subject_analyses').insert(row).execute()
        if getattr(res, 'error', None):
            raise Exception(res.error)
        return {"ok": True, "id": row["id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rag-favorites")
async def get_rag_favorites(request: Request, user_id: Optional[str] = None, favorites: Optional[int] = 0):
    """RAG Q&A 즐겨찾기(저장된 Q&A) 목록 조회"""
    supabase = get_supabase()
    try:
        if favorites and user_id:
            res = supabase.table('fgi_rag_favorites').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
            favorites_list = res.data if hasattr(res, 'data') else []
            return {"favorites": favorites_list}
        return {"favorites": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/favorites")
async def save_favorite_qa(item: dict):
    supabase = get_supabase()
    try:
        res = supabase.table('fgi_rag_favorites').insert(item).execute()
        if getattr(res, 'error', None):
            raise Exception(res.error)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rag")
async def rag_qa(
    file_id: str = Body(...),
    question: str = Body(...),
    user_id: Optional[str] = Body(None),
    chat_history: Optional[list] = Body(None),
    chat_group_id: Optional[str] = Body(None)
):
    """RAG 질의응답: 파일 내에서 관련 청크 검색 후 LLM 답변 생성"""
    try:
        workflow = get_fgi_rag_workflow()
        # chat_group_id가 없으면 새로 생성
        if not chat_group_id:
            chat_group_id = str(uuid.uuid4())
        # 관련 청크 검색
        chunks = await workflow.repository.search_chunks(file_id, question, user_id)
        context = "\n---\n".join([c.chunk_text for c in chunks])
        # LLM 답변 생성
        answer = await workflow.service.analyze_topic(question, context)
        return {"answer": answer, "context": context, "chunks": [c.chunk_text for c in chunks], "chat_group_id": chat_group_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/guide-topics")
async def get_guide_topics(guide_file_name: str, user_id: str):
    """가이드라인 파일명으로 기존 주제 목록 반환 (있으면)"""
    supabase = get_supabase()
    try:
        res = supabase.table('fgi_subject_analyses') \
            .select('topics') \
            .eq('guide_file_name', guide_file_name) \
            .eq('user_id', user_id) \
            .order('created_at', desc=True) \
            .limit(1) \
            .execute()
        if hasattr(res, 'data') and res.data and len(res.data) > 0:
            topics = res.data[0]['topics']
            return {"topics": topics}
        return {"topics": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 