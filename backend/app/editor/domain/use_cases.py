from typing import List, Optional, Dict, Any
from app.editor.domain.entities import (
    Project, ProjectItem, ProjectFile,
    ProjectStatus, ItemType, FileType,
    CreateProjectRequest, UpdateProjectRequest,
    AddProjectItemRequest, UpdateProjectItemRequest,
    UploadProjectFileRequest, CompileProjectRequest,
    ProjectResponse, ProjectListResponse,
    ProjectItemResponse, ProjectItemListResponse,
    ProjectFileResponse, ProjectFileListResponse,
    CompileProjectResponse
)
from app.editor.domain.services import ProjectService


class CreateProjectUseCase:
    """프로젝트 생성 유스케이스"""
    
    def __init__(self, project_service: ProjectService):
        self.project_service = project_service
    
    async def execute(self, user_id: str, request: CreateProjectRequest) -> ProjectResponse:
        try:
            project = await self.project_service.create_project(user_id, request)
            return ProjectResponse(success=True, data=project)
        except Exception as e:
            return ProjectResponse(success=False, error=str(e))


class GetProjectUseCase:
    """프로젝트 조회 유스케이스"""
    
    def __init__(self, project_service: ProjectService):
        self.project_service = project_service
    
    async def execute(self, project_id: str, user_id: str) -> ProjectResponse:
        try:
            project = await self.project_service.get_project(project_id, user_id)
            if not project:
                return ProjectResponse(success=False, error="Project not found")
            return ProjectResponse(success=True, data=project)
        except Exception as e:
            return ProjectResponse(success=False, error=str(e))


class GetUserProjectsUseCase:
    """사용자 프로젝트 목록 조회 유스케이스"""
    
    def __init__(self, project_service: ProjectService):
        self.project_service = project_service
    
    async def execute(self, user_id: str, status: Optional[ProjectStatus] = None) -> ProjectListResponse:
        try:
            projects = await self.project_service.get_user_projects(user_id, status)
            return ProjectListResponse(success=True, data=projects)
        except Exception as e:
            return ProjectListResponse(success=False, error=str(e))


class UpdateProjectUseCase:
    """프로젝트 수정 유스케이스"""
    
    def __init__(self, project_service: ProjectService):
        self.project_service = project_service
    
    async def execute(self, project_id: str, user_id: str, request: UpdateProjectRequest) -> ProjectResponse:
        try:
            project = await self.project_service.update_project(project_id, user_id, request)
            if not project:
                return ProjectResponse(success=False, error="Project not found or access denied")
            return ProjectResponse(success=True, data=project)
        except Exception as e:
            return ProjectResponse(success=False, error=str(e))


class DeleteProjectUseCase:
    """프로젝트 삭제 유스케이스"""
    
    def __init__(self, project_service: ProjectService):
        self.project_service = project_service
    
    async def execute(self, project_id: str, user_id: str) -> ProjectResponse:
        try:
            success = await self.project_service.delete_project(project_id, user_id)
            if not success:
                return ProjectResponse(success=False, error="Project not found or access denied")
            return ProjectResponse(success=True)
        except Exception as e:
            return ProjectResponse(success=False, error=str(e))


class AddProjectItemUseCase:
    """프로젝트 아이템 추가 유스케이스"""
    
    def __init__(self, project_service: ProjectService):
        self.project_service = project_service
    
    async def execute(self, project_id: str, user_id: str, request: AddProjectItemRequest) -> ProjectItemResponse:
        try:
            item = await self.project_service.add_project_item(project_id, user_id, request)
            if not item:
                return ProjectItemResponse(success=False, error="Project not found or access denied")
            return ProjectItemResponse(success=True, data=item)
        except Exception as e:
            return ProjectItemResponse(success=False, error=str(e))


class GetProjectItemsUseCase:
    """프로젝트 아이템 목록 조회 유스케이스"""
    
    def __init__(self, project_service: ProjectService):
        self.project_service = project_service
    
    async def execute(self, project_id: str, user_id: str) -> ProjectItemListResponse:
        try:
            items = await self.project_service.get_project_items(project_id, user_id)
            return ProjectItemListResponse(success=True, data=items)
        except Exception as e:
            return ProjectItemListResponse(success=False, error=str(e))


class UpdateProjectItemUseCase:
    """프로젝트 아이템 수정 유스케이스"""
    
    def __init__(self, project_service: ProjectService):
        self.project_service = project_service
    
    async def execute(self, item_id: str, user_id: str, request: UpdateProjectItemRequest) -> ProjectItemResponse:
        try:
            item = await self.project_service.update_project_item(item_id, user_id, request)
            if not item:
                return ProjectItemResponse(success=False, error="Item not found or access denied")
            return ProjectItemResponse(success=True, data=item)
        except Exception as e:
            return ProjectItemResponse(success=False, error=str(e))


class RemoveProjectItemUseCase:
    """프로젝트 아이템 제거 유스케이스"""
    
    def __init__(self, project_service: ProjectService):
        self.project_service = project_service
    
    async def execute(self, item_id: str, user_id: str) -> ProjectItemResponse:
        try:
            success = await self.project_service.remove_project_item(item_id, user_id)
            if not success:
                return ProjectItemResponse(success=False, error="Item not found or access denied")
            return ProjectItemResponse(success=True)
        except Exception as e:
            return ProjectItemResponse(success=False, error=str(e))


class ReorderProjectItemsUseCase:
    """프로젝트 아이템 순서 변경 유스케이스"""
    
    def __init__(self, project_service: ProjectService):
        self.project_service = project_service
    
    async def execute(self, project_id: str, user_id: str, item_orders: List[Dict[str, Any]]) -> ProjectItemResponse:
        try:
            success = await self.project_service.reorder_project_items(project_id, user_id, item_orders)
            if not success:
                return ProjectItemResponse(success=False, error="Project not found or access denied")
            return ProjectItemResponse(success=True)
        except Exception as e:
            return ProjectItemResponse(success=False, error=str(e))


class UploadProjectFileUseCase:
    """프로젝트 파일 업로드 유스케이스"""
    
    def __init__(self, project_service: ProjectService):
        self.project_service = project_service
    
    async def execute(self, project_id: str, user_id: str, request: UploadProjectFileRequest, 
                     file_path: str, file_size: int) -> ProjectFileResponse:
        try:
            file = await self.project_service.upload_project_file(project_id, user_id, request, file_path, file_size)
            if not file:
                return ProjectFileResponse(success=False, error="Project not found or access denied")
            return ProjectFileResponse(success=True, data=file)
        except Exception as e:
            return ProjectFileResponse(success=False, error=str(e))


class GetProjectFilesUseCase:
    """프로젝트 파일 목록 조회 유스케이스"""
    
    def __init__(self, project_service: ProjectService):
        self.project_service = project_service
    
    async def execute(self, project_id: str, user_id: str) -> ProjectFileListResponse:
        try:
            files = await self.project_service.get_project_files(project_id, user_id)
            return ProjectFileListResponse(success=True, data=files)
        except Exception as e:
            return ProjectFileListResponse(success=False, error=str(e))


class DeleteProjectFileUseCase:
    """프로젝트 파일 삭제 유스케이스"""
    
    def __init__(self, project_service: ProjectService):
        self.project_service = project_service
    
    async def execute(self, file_id: str, user_id: str) -> ProjectFileResponse:
        try:
            success = await self.project_service.delete_project_file(file_id, user_id)
            if not success:
                return ProjectFileResponse(success=False, error="File not found or access denied")
            return ProjectFileResponse(success=True)
        except Exception as e:
            return ProjectFileResponse(success=False, error=str(e))


class CompileProjectUseCase:
    """프로젝트 컴파일 유스케이스"""
    
    def __init__(self, project_service: ProjectService):
        self.project_service = project_service
    
    async def execute(self, project_id: str, user_id: str, request: CompileProjectRequest) -> CompileProjectResponse:
        try:
            file = await self.project_service.compile_project(project_id, user_id, request)
            if not file:
                return CompileProjectResponse(success=False, error="Project not found or access denied")
            return CompileProjectResponse(success=True, file_id=file.id, file_url=f"/api/v1/projects/{project_id}/files/{file.id}/download")
        except ValueError as e:
            return CompileProjectResponse(success=False, error=str(e))
        except Exception as e:
            return CompileProjectResponse(success=False, error=str(e)) 