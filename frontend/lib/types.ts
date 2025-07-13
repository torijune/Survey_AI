// lib/types.ts
export interface News {
  id: string;
  title: string;
  link?: string | null;
  date?: string | null;
  content: string;
  company: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarketCondition {
  id: string;
  date: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Embedding {
  id: string;
  resourceId: string;
  content: string;
  embedding: number[];
}

// 프로젝트 관련 타입
export type ProjectStatus = 'active' | 'archived' | 'deleted';
export type FileType = 'pdf' | 'docx' | 'zip' | 'xlsx' | 'other';

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  items?: ProjectItem[];
  files?: ProjectFile[];
}

export interface ProjectItem {
  id: string;
  project_id: string;
  item_type: string;
  item_id: string;
  title: string;
  description?: string;
  order_index: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  file_name: string;
  file_path: string;
  file_type: FileType;
  file_size?: number;
  description?: string;
  is_compiled: boolean;
  compiled_from_items?: Record<string, any>;
  created_at: string;
  updated_at: string;
}
