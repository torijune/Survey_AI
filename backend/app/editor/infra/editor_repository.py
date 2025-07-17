from typing import List, Optional, Dict, Any
from datetime import datetime
from app.editor.domain.entities import Project, ProjectItem, ProjectFile, ProjectStatus
from utils.supabase_client import get_supabase


class ProjectRepository:
    """프로젝트 리포지토리"""
    
    def __init__(self):
        self.supabase = get_supabase()
    
    async def create(self, project: Project) -> Project:
        """프로젝트 생성"""
        data = {
            "id": project.id,
            "user_id": project.user_id,
            "title": project.title,
            "description": project.description,
            "status": project.status.value,
            "created_at": project.created_at.isoformat() if project.created_at else None,
            "updated_at": project.updated_at.isoformat() if project.updated_at else None
        }
        
        result = self.supabase.table("projects").insert(data).execute()
        
        if result.data:
            created_data = result.data[0]
            return Project(
                id=created_data["id"],
                user_id=created_data["user_id"],
                title=created_data["title"],
                description=created_data["description"],
                status=ProjectStatus(created_data["status"]),
                created_at=datetime.fromisoformat(created_data["created_at"]) if created_data["created_at"] else None,
                updated_at=datetime.fromisoformat(created_data["updated_at"]) if created_data["updated_at"] else None
            )
        else:
            raise Exception("Failed to create project")
    
    async def get_by_id_and_user(self, project_id: str, user_id: str) -> Optional[Project]:
        """사용자의 특정 프로젝트 조회"""
        result = self.supabase.table("projects").select("*").eq("id", project_id).eq("user_id", user_id).execute()
        
        if result.data:
            data = result.data[0]
            return Project(
                id=data["id"],
                user_id=data["user_id"],
                title=data["title"],
                description=data["description"],
                status=ProjectStatus(data["status"]),
                created_at=datetime.fromisoformat(data["created_at"]) if data["created_at"] else None,
                updated_at=datetime.fromisoformat(data["updated_at"]) if data["updated_at"] else None
            )
        return None
    
    async def get_by_user_id(self, user_id: str, status: Optional[ProjectStatus] = None) -> List[Project]:
        """사용자의 프로젝트 목록 조회"""
        query = self.supabase.table("projects").select("*").eq("user_id", user_id)
        
        if status:
            query = query.eq("status", status.value)
        
        result = query.order("created_at", desc=True).execute()
        
        projects = []
        for data in result.data:
            project = Project(
                id=data["id"],
                user_id=data["user_id"],
                title=data["title"],
                description=data["description"],
                status=ProjectStatus(data["status"]),
                created_at=datetime.fromisoformat(data["created_at"]) if data["created_at"] else None,
                updated_at=datetime.fromisoformat(data["updated_at"]) if data["updated_at"] else None
            )
            projects.append(project)
        
        return projects
    
    async def update(self, project_id: str, update_data: Dict[str, Any]) -> Optional[Project]:
        """프로젝트 수정"""
        # datetime 객체를 ISO 문자열로 변환
        if "created_at" in update_data and isinstance(update_data["created_at"], datetime):
            update_data["created_at"] = update_data["created_at"].isoformat()
        if "updated_at" in update_data and isinstance(update_data["updated_at"], datetime):
            update_data["updated_at"] = update_data["updated_at"].isoformat()
        
        result = self.supabase.table("projects").update(update_data).eq("id", project_id).execute()
        
        if result.data:
            data = result.data[0]
            return Project(
                id=data["id"],
                user_id=data["user_id"],
                title=data["title"],
                description=data["description"],
                status=ProjectStatus(data["status"]),
                created_at=datetime.fromisoformat(data["created_at"]) if data["created_at"] else None,
                updated_at=datetime.fromisoformat(data["updated_at"]) if data["updated_at"] else None
            )
        return None


class ProjectItemRepository:
    """프로젝트 아이템 리포지토리"""
    
    def __init__(self):
        self.supabase = get_supabase()
    
    async def create(self, item: ProjectItem) -> ProjectItem:
        """프로젝트 아이템 생성"""
        data = {
            "id": item.id,
            "project_id": item.project_id,
            "item_type": item.item_type.value,
            "item_id": item.item_id,
            "title": item.title,
            "description": item.description,
            "order_index": item.order_index,
            "metadata": item.metadata,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "updated_at": item.updated_at.isoformat() if item.updated_at else None
        }
        
        result = self.supabase.table("project_items").insert(data).execute()
        
        if result.data:
            created_data = result.data[0]
            return ProjectItem(
                id=created_data["id"],
                project_id=created_data["project_id"],
                item_type=created_data["item_type"],
                item_id=created_data["item_id"],
                title=created_data["title"],
                description=created_data["description"],
                order_index=created_data["order_index"],
                metadata=created_data["metadata"],
                created_at=datetime.fromisoformat(created_data["created_at"]) if created_data["created_at"] else None,
                updated_at=datetime.fromisoformat(created_data["updated_at"]) if created_data["updated_at"] else None
            )
        else:
            raise Exception("Failed to create project item")
    
    async def get_by_id(self, item_id: str) -> Optional[ProjectItem]:
        """프로젝트 아이템 조회"""
        result = self.supabase.table("project_items").select("*").eq("id", item_id).execute()
        
        if result.data:
            data = result.data[0]
            return ProjectItem(
                id=data["id"],
                project_id=data["project_id"],
                item_type=data["item_type"],
                item_id=data["item_id"],
                title=data["title"],
                description=data["description"],
                order_index=data["order_index"],
                metadata=data["metadata"],
                created_at=datetime.fromisoformat(data["created_at"]) if data["created_at"] else None,
                updated_at=datetime.fromisoformat(data["updated_at"]) if data["updated_at"] else None
            )
        return None
    
    async def get_by_project_id(self, project_id: str) -> List[ProjectItem]:
        """프로젝트의 아이템 목록 조회"""
        result = self.supabase.table("project_items").select("*").eq("project_id", project_id).order("order_index").execute()
        
        items = []
        for data in result.data:
            item = ProjectItem(
                id=data["id"],
                project_id=data["project_id"],
                item_type=data["item_type"],
                item_id=data["item_id"],
                title=data["title"],
                description=data["description"],
                order_index=data["order_index"],
                metadata=data["metadata"],
                created_at=datetime.fromisoformat(data["created_at"]) if data["created_at"] else None,
                updated_at=datetime.fromisoformat(data["updated_at"]) if data["updated_at"] else None
            )
            items.append(item)
        
        return items
    
    async def update(self, item_id: str, update_data: Dict[str, Any]) -> Optional[ProjectItem]:
        """프로젝트 아이템 수정"""
        # datetime 객체를 ISO 문자열로 변환
        if "created_at" in update_data and isinstance(update_data["created_at"], datetime):
            update_data["created_at"] = update_data["created_at"].isoformat()
        if "updated_at" in update_data and isinstance(update_data["updated_at"], datetime):
            update_data["updated_at"] = update_data["updated_at"].isoformat()
        
        result = self.supabase.table("project_items").update(update_data).eq("id", item_id).execute()
        
        if result.data:
            data = result.data[0]
            return ProjectItem(
                id=data["id"],
                project_id=data["project_id"],
                item_type=data["item_type"],
                item_id=data["item_id"],
                title=data["title"],
                description=data["description"],
                order_index=data["order_index"],
                metadata=data["metadata"],
                created_at=datetime.fromisoformat(data["created_at"]) if data["created_at"] else None,
                updated_at=datetime.fromisoformat(data["updated_at"]) if data["updated_at"] else None
            )
        return None
    
    async def delete(self, item_id: str) -> bool:
        """프로젝트 아이템 삭제"""
        result = self.supabase.table("project_items").delete().eq("id", item_id).execute()
        return len(result.data) > 0


class ProjectFileRepository:
    """프로젝트 파일 리포지토리"""
    
    def __init__(self):
        self.supabase = get_supabase()
    
    async def create(self, file: ProjectFile) -> ProjectFile:
        """프로젝트 파일 생성"""
        data = {
            "id": file.id,
            "project_id": file.project_id,
            "file_name": file.file_name,
            "file_path": file.file_path,
            "file_type": file.file_type.value,
            "file_size": file.file_size,
            "description": file.description,
            "is_compiled": file.is_compiled,
            "compiled_from_items": file.compiled_from_items,
            "created_at": file.created_at.isoformat() if file.created_at else None,
            "updated_at": file.updated_at.isoformat() if file.updated_at else None
        }
        
        result = self.supabase.table("project_files").insert(data).execute()
        
        if result.data:
            created_data = result.data[0]
            return ProjectFile(
                id=created_data["id"],
                project_id=created_data["project_id"],
                file_name=created_data["file_name"],
                file_path=created_data["file_path"],
                file_type=created_data["file_type"],
                file_size=created_data["file_size"],
                description=created_data["description"],
                is_compiled=created_data["is_compiled"],
                compiled_from_items=created_data["compiled_from_items"],
                created_at=datetime.fromisoformat(created_data["created_at"]) if created_data["created_at"] else None,
                updated_at=datetime.fromisoformat(created_data["updated_at"]) if created_data["updated_at"] else None
            )
        else:
            raise Exception("Failed to create project file")
    
    async def get_by_id(self, file_id: str) -> Optional[ProjectFile]:
        """프로젝트 파일 조회"""
        result = self.supabase.table("project_files").select("*").eq("id", file_id).execute()
        
        if result.data:
            data = result.data[0]
            return ProjectFile(
                id=data["id"],
                project_id=data["project_id"],
                file_name=data["file_name"],
                file_path=data["file_path"],
                file_type=data["file_type"],
                file_size=data["file_size"],
                description=data["description"],
                is_compiled=data["is_compiled"],
                compiled_from_items=data["compiled_from_items"],
                created_at=datetime.fromisoformat(data["created_at"]) if data["created_at"] else None,
                updated_at=datetime.fromisoformat(data["updated_at"]) if data["updated_at"] else None
            )
        return None
    
    async def get_by_project_id(self, project_id: str) -> List[ProjectFile]:
        """프로젝트의 파일 목록 조회"""
        result = self.supabase.table("project_files").select("*").eq("project_id", project_id).order("created_at", desc=True).execute()
        
        files = []
        for data in result.data:
            file = ProjectFile(
                id=data["id"],
                project_id=data["project_id"],
                file_name=data["file_name"],
                file_path=data["file_path"],
                file_type=data["file_type"],
                file_size=data["file_size"],
                description=data["description"],
                is_compiled=data["is_compiled"],
                compiled_from_items=data["compiled_from_items"],
                created_at=datetime.fromisoformat(data["created_at"]) if data["created_at"] else None,
                updated_at=datetime.fromisoformat(data["updated_at"]) if data["updated_at"] else None
            )
            files.append(file)
        
        return files
    
    async def delete(self, file_id: str) -> bool:
        """프로젝트 파일 삭제"""
        result = self.supabase.table("project_files").delete().eq("id", file_id).execute()
        return len(result.data) > 0 