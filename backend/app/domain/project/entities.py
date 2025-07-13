from typing import Optional, Dict, Any, List, Union
from pydantic import BaseModel
from datetime import datetime
from enum import Enum


class ProjectStatus(str, Enum):
    """프로젝트 상태"""
    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"


class ItemType(str, Enum):
    """프로젝트 아이템 타입"""
    SURVEY_PLAN = "survey_plan"
    SURVEY_ANALYSIS = "survey_analysis"
    SURVEY_VISUALIZATION = "survey_visualization"
    FGI_ANALYSIS = "fgi_analysis"
    BATCH_ANALYSIS = "batch_analysis"


class FileType(str, Enum):
    """프로젝트 파일 타입"""
    PDF = "pdf"
    DOCX = "docx"
    ZIP = "zip"
    XLSX = "xlsx"
    OTHER = "other"


class Project(BaseModel):
    """프로젝트 엔티티"""
    id: Optional[str] = None
    user_id: str
    title: str
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.ACTIVE
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    items: Optional[List['ProjectItem']] = None
    files: Optional[List['ProjectFile']] = None

    class Config:
        from_attributes = True


class ProjectItem(BaseModel):
    """프로젝트 아이템 엔티티"""
    id: Optional[str] = None
    project_id: str
    item_type: ItemType
    item_id: str  # 실제 분석/시각화/계획의 ID
    title: str
    description: Optional[str] = None
    order_index: int = 0
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProjectFile(BaseModel):
    """프로젝트 파일 엔티티"""
    id: Optional[str] = None
    project_id: str
    file_name: str
    file_path: str
    file_type: FileType
    file_size: Optional[int] = None
    description: Optional[str] = None
    is_compiled: bool = False
    compiled_from_items: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Request/Response Models
class CreateProjectRequest(BaseModel):
    """프로젝트 생성 요청"""
    title: str
    description: Optional[str] = None


class UpdateProjectRequest(BaseModel):
    """프로젝트 수정 요청"""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None


class AddProjectItemRequest(BaseModel):
    """프로젝트 아이템 추가 요청"""
    item_type: ItemType
    item_id: str
    title: str
    description: Optional[str] = None
    order_index: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class UpdateProjectItemRequest(BaseModel):
    """프로젝트 아이템 수정 요청"""
    title: Optional[str] = None
    description: Optional[str] = None
    order_index: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class UploadProjectFileRequest(BaseModel):
    """프로젝트 파일 업로드 요청"""
    file_name: str
    file_type: FileType
    description: Optional[str] = None
    is_compiled: bool = False
    compiled_from_items: Optional[Dict[str, Any]] = None


class CompileProjectRequest(BaseModel):
    """프로젝트 컴파일 요청"""
    item_ids: List[str]
    output_format: FileType = FileType.PDF
    include_summaries: bool = True
    include_charts: bool = True
    include_raw_data: bool = False


# Response Models
class ProjectResponse(BaseModel):
    """프로젝트 응답"""
    success: bool
    data: Optional[Project] = None
    error: Optional[str] = None


class ProjectListResponse(BaseModel):
    """프로젝트 목록 응답"""
    success: bool
    data: Optional[List[Project]] = None
    error: Optional[str] = None


class ProjectItemResponse(BaseModel):
    """프로젝트 아이템 응답"""
    success: bool
    data: Optional[ProjectItem] = None
    error: Optional[str] = None


class ProjectItemListResponse(BaseModel):
    """프로젝트 아이템 목록 응답"""
    success: bool
    data: Optional[List[ProjectItem]] = None
    error: Optional[str] = None


class ProjectFileResponse(BaseModel):
    """프로젝트 파일 응답"""
    success: bool
    data: Optional[ProjectFile] = None
    error: Optional[str] = None


class ProjectFileListResponse(BaseModel):
    """프로젝트 파일 목록 응답"""
    success: bool
    data: Optional[List[ProjectFile]] = None
    error: Optional[str] = None


class CompileProjectResponse(BaseModel):
    """프로젝트 컴파일 응답"""
    success: bool
    file_url: Optional[str] = None
    file_id: Optional[str] = None
    error: Optional[str] = None 