from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Optional, Dict, Any
import os
import shutil
from datetime import datetime

from app.editor.domain.entities import (
    CreateProjectRequest, UpdateProjectRequest,
    AddProjectItemRequest, UpdateProjectItemRequest,
    UploadProjectFileRequest, CompileProjectRequest,
    ProjectStatus, FileType
)
from app.editor.domain.use_cases import (
    CreateProjectUseCase, GetProjectUseCase, GetUserProjectsUseCase,
    UpdateProjectUseCase, DeleteProjectUseCase,
    AddProjectItemUseCase, GetProjectItemsUseCase, UpdateProjectItemUseCase,
    RemoveProjectItemUseCase, ReorderProjectItemsUseCase,
    UploadProjectFileUseCase, GetProjectFilesUseCase, DeleteProjectFileUseCase,
    CompileProjectUseCase
)
from app.editor.domain.services import ProjectService
from app.editor.infra.editor_repository import ProjectRepository, ProjectItemRepository, ProjectFileRepository
from backend.utils.supabase_client import get_supabase
from app.utils.auth import get_user_id_from_token


router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


# Dependency injection
def get_project_service():
    project_repo = ProjectRepository()
    item_repo = ProjectItemRepository()
    file_repo = ProjectFileRepository()
    return ProjectService(project_repo, item_repo, file_repo)


# Project CRUD endpoints
@router.post("/")
async def create_project(
    request: CreateProjectRequest,
    project_service: ProjectService = Depends(get_project_service),
    user_id: str = Depends(get_user_id_from_token)
):
    """프로젝트 생성"""
    use_case = CreateProjectUseCase(project_service)
    response = await use_case.execute(user_id, request)
    
    if not response.success:
        raise HTTPException(status_code=400, detail=response.error)
    
    return response.data


@router.get("/")
async def get_user_projects(
    status: Optional[ProjectStatus] = None,
    project_service: ProjectService = Depends(get_project_service),
    user_id: str = Depends(get_user_id_from_token)
):
    """사용자의 프로젝트 목록 조회"""
    use_case = GetUserProjectsUseCase(project_service)
    response = await use_case.execute(user_id, status)
    
    if not response.success:
        raise HTTPException(status_code=400, detail=response.error)
    
    return response.data


@router.get("/{project_id}")
async def get_project(
    project_id: str,
    project_service: ProjectService = Depends(get_project_service),
    user_id: str = Depends(get_user_id_from_token)
):
    """프로젝트 조회"""
    use_case = GetProjectUseCase(project_service)
    response = await use_case.execute(project_id, user_id)
    
    if not response.success:
        raise HTTPException(status_code=404, detail=response.error)
    
    return response.data


@router.put("/{project_id}")
async def update_project(
    project_id: str,
    request: UpdateProjectRequest,
    project_service: ProjectService = Depends(get_project_service),
    user_id: str = Depends(get_user_id_from_token)
):
    """프로젝트 수정"""
    use_case = UpdateProjectUseCase(project_service)
    response = await use_case.execute(project_id, user_id, request)
    
    if not response.success:
        raise HTTPException(status_code=404, detail=response.error)
    
    return response.data


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    project_service: ProjectService = Depends(get_project_service),
    user_id: str = Depends(get_user_id_from_token)
):
    """프로젝트 삭제"""
    use_case = DeleteProjectUseCase(project_service)
    response = await use_case.execute(project_id, user_id)
    
    if not response.success:
        raise HTTPException(status_code=404, detail=response.error)
    
    return {"message": "Project deleted successfully"}


# Project Items endpoints
@router.post("/{project_id}/items")
async def add_project_item(
    project_id: str,
    request: AddProjectItemRequest,
    project_service: ProjectService = Depends(get_project_service),
    user_id: str = Depends(get_user_id_from_token)
):
    """프로젝트에 아이템 추가"""
    use_case = AddProjectItemUseCase(project_service)
    response = await use_case.execute(project_id, user_id, request)
    
    if not response.success:
        raise HTTPException(status_code=400, detail=response.error)
    
    return response.data


@router.get("/{project_id}/items")
async def get_project_items(
    project_id: str,
    project_service: ProjectService = Depends(get_project_service),
    user_id: str = Depends(get_user_id_from_token)
):
    """프로젝트 아이템 목록 조회"""
    use_case = GetProjectItemsUseCase(project_service)
    response = await use_case.execute(project_id, user_id)
    
    if not response.success:
        raise HTTPException(status_code=400, detail=response.error)
    
    return response.data


@router.put("/items/{item_id}")
async def update_project_item(
    item_id: str,
    request: UpdateProjectItemRequest,
    project_service: ProjectService = Depends(get_project_service),
    user_id: str = Depends(get_user_id_from_token)
):
    """프로젝트 아이템 수정"""
    use_case = UpdateProjectItemUseCase(project_service)
    response = await use_case.execute(item_id, user_id, request)
    
    if not response.success:
        raise HTTPException(status_code=404, detail=response.error)
    
    return response.data


@router.delete("/items/{item_id}")
async def remove_project_item(
    item_id: str,
    project_service: ProjectService = Depends(get_project_service),
    user_id: str = Depends(get_user_id_from_token)
):
    """프로젝트 아이템 제거"""
    use_case = RemoveProjectItemUseCase(project_service)
    response = await use_case.execute(item_id, user_id)
    
    if not response.success:
        raise HTTPException(status_code=404, detail=response.error)
    
    return {"message": "Item removed successfully"}


@router.put("/{project_id}/items/reorder")
async def reorder_project_items(
    project_id: str,
    item_orders: List[Dict[str, Any]],
    project_service: ProjectService = Depends(get_project_service),
    user_id: str = Depends(get_user_id_from_token)
):
    """프로젝트 아이템 순서 변경"""
    use_case = ReorderProjectItemsUseCase(project_service)
    response = await use_case.execute(project_id, user_id, item_orders)
    
    if not response.success:
        raise HTTPException(status_code=400, detail=response.error)
    
    return {"message": "Items reordered successfully"}


# Project Files endpoints
@router.post("/{project_id}/files")
async def upload_project_file(
    project_id: str,
    file: UploadFile = File(...),
    file_type: FileType = Form(...),
    description: Optional[str] = Form(None),
    is_compiled: bool = Form(False),
    compiled_from_items: Optional[str] = Form(None),
    project_service: ProjectService = Depends(get_project_service),
    user_id: str = Depends(get_user_id_from_token)
):
    """프로젝트 파일 업로드"""
    # 파일 저장 경로 설정
    upload_dir = f"uploads/projects/{project_id}"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, file.filename)
    
    # 파일 저장
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # 파일 크기 계산
    file_size = os.path.getsize(file_path)
    
    # JSON 파싱 (compiled_from_items가 문자열로 전달됨)
    compiled_items = None
    if compiled_from_items:
        import json
        try:
            compiled_items = json.loads(compiled_from_items)
        except json.JSONDecodeError:
            compiled_items = None
    
    request = UploadProjectFileRequest(
        file_name=file.filename,
        file_type=file_type,
        description=description,
        is_compiled=is_compiled,
        compiled_from_items=compiled_items
    )
    
    use_case = UploadProjectFileUseCase(project_service)
    response = await use_case.execute(project_id, user_id, request, file_path, file_size)
    
    if not response.success:
        raise HTTPException(status_code=400, detail=response.error)
    
    return response.data


@router.get("/{project_id}/files")
async def get_project_files(
    project_id: str,
    project_service: ProjectService = Depends(get_project_service),
    user_id: str = Depends(get_user_id_from_token)
):
    """프로젝트 파일 목록 조회"""
    use_case = GetProjectFilesUseCase(project_service)
    response = await use_case.execute(project_id, user_id)
    
    if not response.success:
        raise HTTPException(status_code=400, detail=response.error)
    
    return response.data


@router.delete("/files/{file_id}")
async def delete_project_file(
    file_id: str,
    project_service: ProjectService = Depends(get_project_service),
    user_id: str = Depends(get_user_id_from_token)
):
    """프로젝트 파일 삭제"""
    use_case = DeleteProjectFileUseCase(project_service)
    response = await use_case.execute(file_id, user_id)
    
    if not response.success:
        raise HTTPException(status_code=404, detail=response.error)
    
    return {"message": "File deleted successfully"}


@router.get("/files/{file_id}/download")
async def download_project_file(
    file_id: str,
    project_service: ProjectService = Depends(get_project_service),
    user_id: str = Depends(get_user_id_from_token)
):
    """프로젝트 파일 다운로드"""
    # 파일 정보 조회
    file_repo = ProjectFileRepository()
    file = await file_repo.get_by_id(file_id)
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # 프로젝트 소유자 확인
    project_repo = ProjectRepository()
    project = await project_repo.get_by_id_and_user(file.project_id, user_id)
    
    if not project:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # 파일 존재 확인
    if not os.path.exists(file.file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
    
    # 파일 다운로드 응답
    from fastapi.responses import FileResponse
    return FileResponse(
        path=file.file_path,
        filename=file.file_name,
        media_type='application/octet-stream'
    )


# Project Compile endpoint
@router.post("/{project_id}/compile")
async def compile_project(
    project_id: str,
    request: CompileProjectRequest,
    project_service: ProjectService = Depends(get_project_service),
    user_id: str = Depends(get_user_id_from_token)
):
    """프로젝트 컴파일"""
    use_case = CompileProjectUseCase(project_service)
    response = await use_case.execute(project_id, user_id, request)
    
    if not response.success:
        raise HTTPException(status_code=400, detail=response.error)
    
    return response 