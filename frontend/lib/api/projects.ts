import { FileType, ProjectStatus } from '../types';
import { env } from '../env.mjs';
import { getAuthHeaders, getAuthToken } from './auth';

const API_BASE = `${env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/api/v1/projects`;

// 프로젝트 목록 조회
export async function fetchProjects(status?: ProjectStatus) {
  const url = status ? `${API_BASE}?status=${status}` : API_BASE;
  const headers = await getAuthHeaders();
  const res = await fetch(url, { 
    headers,
    credentials: 'include' 
  });
  if (!res.ok) throw new Error('프로젝트 목록 조회 실패');
  return res.json();
}

// 프로젝트 생성
export async function createProject(title: string, description?: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ title, description }),
  });
  if (!res.ok) throw new Error('프로젝트 생성 실패');
  return res.json();
}

// 프로젝트 삭제
export async function deleteProject(projectId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/${projectId}`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  });
  if (!res.ok) throw new Error('프로젝트 삭제 실패');
  return res.json();
}

// 프로젝트 상세 조회
export async function fetchProject(projectId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/${projectId}`, { 
    headers,
    credentials: 'include' 
  });
  if (!res.ok) throw new Error('프로젝트 조회 실패');
  return res.json();
}

// 아이템 목록 조회
export async function fetchProjectItems(projectId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/${projectId}/items`, { 
    headers,
    credentials: 'include' 
  });
  if (!res.ok) throw new Error('프로젝트 아이템 조회 실패');
  return res.json();
}

// 파일 목록 조회
export async function fetchProjectFiles(projectId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/${projectId}/files`, { 
    headers,
    credentials: 'include' 
  });
  if (!res.ok) throw new Error('프로젝트 파일 조회 실패');
  return res.json();
}

// 파일 업로드
export async function uploadProjectFile(projectId: string, file: File, fileType: FileType, description?: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('file_type', fileType);
  if (description) formData.append('description', description);
  
  const token = await getAuthToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch(`${API_BASE}/${projectId}/files`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) throw new Error('파일 업로드 실패');
  return res.json();
}

// 프로젝트 컴파일
export async function compileProject(projectId: string, itemIds: string[], outputFormat: FileType) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/${projectId}/compile`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ item_ids: itemIds, output_format: outputFormat }),
  });
  if (!res.ok) throw new Error('프로젝트 컴파일 실패');
  return res.json();
} 