from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid
from .entities import (
    Project, ProjectItem, ProjectFile,
    ProjectStatus, ItemType, FileType,
    CreateProjectRequest, UpdateProjectRequest,
    AddProjectItemRequest, UpdateProjectItemRequest,
    UploadProjectFileRequest, CompileProjectRequest
)


class ProjectService:
    """프로젝트 관리 비즈니스 로직 서비스"""
    
    def __init__(self, project_repository, project_item_repository, project_file_repository):
        self.project_repository = project_repository
        self.project_item_repository = project_item_repository
        self.project_file_repository = project_file_repository
    
    async def create_project(self, user_id: str, request: CreateProjectRequest) -> Project:
        """프로젝트 생성"""
        project = Project(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=request.title,
            description=request.description,
            status=ProjectStatus.ACTIVE,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        return await self.project_repository.create(project)
    
    async def get_project(self, project_id: str, user_id: str) -> Optional[Project]:
        """프로젝트 조회 (아이템과 파일 포함)"""
        project = await self.project_repository.get_by_id_and_user(project_id, user_id)
        if project:
            project.items = await self.project_item_repository.get_by_project_id(project.id)
            project.files = await self.project_file_repository.get_by_project_id(project.id)
        return project
    
    async def get_user_projects(self, user_id: str, status: Optional[ProjectStatus] = None) -> List[Project]:
        """사용자의 프로젝트 목록 조회 (아이템과 파일 포함)"""
        projects = await self.project_repository.get_by_user_id(user_id, status)
        
        # 각 프로젝트에 아이템과 파일 정보 추가
        for project in projects:
            project.items = await self.project_item_repository.get_by_project_id(project.id)
            project.files = await self.project_file_repository.get_by_project_id(project.id)
        
        return projects
    
    async def update_project(self, project_id: str, user_id: str, request: UpdateProjectRequest) -> Optional[Project]:
        """프로젝트 수정"""
        project = await self.get_project(project_id, user_id)
        if not project:
            return None
        
        update_data = {}
        if request.title is not None:
            update_data["title"] = request.title
        if request.description is not None:
            update_data["description"] = request.description
        if request.status is not None:
            update_data["status"] = request.status
        
        update_data["updated_at"] = datetime.utcnow()
        
        return await self.project_repository.update(project_id, update_data)
    
    async def delete_project(self, project_id: str, user_id: str) -> bool:
        """프로젝트 삭제 (소프트 삭제)"""
        project = await self.get_project(project_id, user_id)
        if not project:
            return False
        
        return await self.project_repository.update(project_id, {
            "status": ProjectStatus.DELETED,
            "updated_at": datetime.utcnow()
        })
    
    async def add_project_item(self, project_id: str, user_id: str, request: AddProjectItemRequest) -> Optional[ProjectItem]:
        """프로젝트에 아이템 추가"""
        # 프로젝트 존재 확인
        project = await self.get_project(project_id, user_id)
        if not project:
            return None
        
        # 순서 인덱스 자동 설정
        if request.order_index is None:
            existing_items = await self.project_item_repository.get_by_project_id(project_id)
            request.order_index = len(existing_items)
        
        item = ProjectItem(
            id=str(uuid.uuid4()),
            project_id=project_id,
            item_type=request.item_type,
            item_id=request.item_id,
            title=request.title,
            description=request.description,
            order_index=request.order_index,
            metadata=request.metadata,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        return await self.project_item_repository.create(item)
    
    async def get_project_items(self, project_id: str, user_id: str) -> List[ProjectItem]:
        """프로젝트 아이템 목록 조회"""
        # 프로젝트 존재 확인
        project = await self.get_project(project_id, user_id)
        if not project:
            return []
        
        return await self.project_item_repository.get_by_project_id(project_id)
    
    async def update_project_item(self, item_id: str, user_id: str, request: UpdateProjectItemRequest) -> Optional[ProjectItem]:
        """프로젝트 아이템 수정"""
        item = await self.project_item_repository.get_by_id(item_id)
        if not item:
            return None
        
        # 프로젝트 소유자 확인
        project = await self.get_project(item.project_id, user_id)
        if not project:
            return None
        
        update_data = {}
        if request.title is not None:
            update_data["title"] = request.title
        if request.description is not None:
            update_data["description"] = request.description
        if request.order_index is not None:
            update_data["order_index"] = request.order_index
        if request.metadata is not None:
            update_data["metadata"] = request.metadata
        
        update_data["updated_at"] = datetime.utcnow()
        
        return await self.project_item_repository.update(item_id, update_data)
    
    async def remove_project_item(self, item_id: str, user_id: str) -> bool:
        """프로젝트 아이템 제거"""
        item = await self.project_item_repository.get_by_id(item_id)
        if not item:
            return False
        
        # 프로젝트 소유자 확인
        project = await self.get_project(item.project_id, user_id)
        if not project:
            return False
        
        return await self.project_item_repository.delete(item_id)
    
    async def reorder_project_items(self, project_id: str, user_id: str, item_orders: List[Dict[str, Any]]) -> bool:
        """프로젝트 아이템 순서 변경"""
        # 프로젝트 존재 확인
        project = await self.get_project(project_id, user_id)
        if not project:
            return False
        
        for order_info in item_orders:
            item_id = order_info.get("item_id")
            new_order = order_info.get("order_index")
            if item_id and new_order is not None:
                await self.project_item_repository.update(item_id, {
                    "order_index": new_order,
                    "updated_at": datetime.utcnow()
                })
        
        return True
    
    async def upload_project_file(self, project_id: str, user_id: str, request: UploadProjectFileRequest, file_path: str, file_size: int) -> Optional[ProjectFile]:
        """프로젝트 파일 업로드"""
        # 프로젝트 존재 확인
        project = await self.get_project(project_id, user_id)
        if not project:
            return None
        
        file = ProjectFile(
            id=str(uuid.uuid4()),
            project_id=project_id,
            file_name=request.file_name,
            file_path=file_path,
            file_type=request.file_type,
            file_size=file_size,
            description=request.description,
            is_compiled=request.is_compiled,
            compiled_from_items=request.compiled_from_items,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        return await self.project_file_repository.create(file)
    
    async def get_project_files(self, project_id: str, user_id: str) -> List[ProjectFile]:
        """프로젝트 파일 목록 조회"""
        # 프로젝트 존재 확인
        project = await self.get_project(project_id, user_id)
        if not project:
            return []
        
        return await self.project_file_repository.get_by_project_id(project_id)
    
    async def delete_project_file(self, file_id: str, user_id: str) -> bool:
        """프로젝트 파일 삭제"""
        file = await self.project_file_repository.get_by_id(file_id)
        if not file:
            return False
        
        # 프로젝트 소유자 확인
        project = await self.get_project(file.project_id, user_id)
        if not project:
            return False
        
        return await self.project_file_repository.delete(file_id)
    
    async def compile_project(self, project_id: str, user_id: str, request: CompileProjectRequest) -> Optional[ProjectFile]:
        """프로젝트 컴파일"""
        # 프로젝트 존재 확인
        project = await self.get_project(project_id, user_id)
        if not project:
            return None
        
        # 아이템 존재 확인
        items = await self.get_project_items(project_id, user_id)
        item_ids = [item.item_id for item in items]
        
        for item_id in request.item_ids:
            if item_id not in item_ids:
                raise ValueError(f"Item {item_id} not found in project")
        
        # 컴파일 로직 (실제 구현은 별도 서비스에서)
        compiled_file_path = await self._compile_items_to_file(
            project_id, request.item_ids, request.output_format,
            request.include_summaries, request.include_charts, request.include_raw_data
        )
        
        # 컴파일된 파일 정보 저장
        file_name = f"project_{project_id}_compiled_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.{request.output_format.value}"
        
        upload_request = UploadProjectFileRequest(
            file_name=file_name,
            file_type=request.output_format,
            description=f"Compiled project file with {len(request.item_ids)} items",
            is_compiled=True,
            compiled_from_items={
                "item_ids": request.item_ids,
                "output_format": request.output_format.value,
                "include_summaries": request.include_summaries,
                "include_charts": request.include_charts,
                "include_raw_data": request.include_raw_data
            }
        )
        
        return await self.upload_project_file(
            project_id, user_id, upload_request, compiled_file_path, 0
        )
    
    async def _compile_items_to_file(self, project_id: str, item_ids: List[str], 
                                   output_format: FileType, include_summaries: bool, 
                                   include_charts: bool, include_raw_data: bool) -> str:
        """아이템들을 파일로 컴파일 (실제 구현은 별도 서비스에서)"""
        # TODO: 실제 컴파일 로직 구현
        # - 각 아이템의 데이터 조회
        # - 요청된 형식으로 파일 생성
        # - 파일 경로 반환
        
        # 임시 구현
        import os
        temp_dir = "/tmp/project_compiles"
        os.makedirs(temp_dir, exist_ok=True)
        
        file_path = os.path.join(temp_dir, f"compiled_{project_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.{output_format.value}")
        
        # 실제로는 여기서 각 아이템의 데이터를 조회하고 파일을 생성
        with open(file_path, 'w') as f:
            f.write(f"Compiled project {project_id} with {len(item_ids)} items\n")
            f.write(f"Format: {output_format.value}\n")
            f.write(f"Items: {', '.join(item_ids)}\n")
        
        return file_path 