'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Folder, File, ChevronRight, ChevronDown, MoreVertical } from 'lucide-react';
import { Project, ProjectItem, ProjectFile } from '@/lib/types';
import { fetchProjects } from '@/lib/api/projects';

interface ProjectSidebarProps {
  selectedProject?: Project;
  onProjectSelect: (project: Project) => void;
  onFileSelect: (file: ProjectFile) => void;
  onCreateProject: () => void;
}

export default function ProjectSidebar({
  selectedProject,
  onProjectSelect,
  onFileSelect,
  onCreateProject
}: ProjectSidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjectsData();
  }, []);

  const fetchProjectsData = async () => {
    try {
      setLoading(true);
      const response = await fetchProjects();
      
      // 백엔드 응답 구조에 맞게 처리
      if (Array.isArray(response)) {
        setProjects(response);
      } else if (response.data) {
        setProjects(response.data);
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error('프로젝트 목록을 가져오는데 실패했습니다:', error);
      // 에러 시 목 데이터 사용
      const mockProjects: Project[] = [
        {
          id: '1',
          user_id: 'user-1',
          title: '설문조사 프로젝트 1',
          description: '첫 번째 설문조사 분석 프로젝트',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          items: [
            {
              id: '1-1',
              project_id: '1',
              item_type: 'analysis',
              item_id: 'analysis-1',
              title: '설문 분석 결과',
              order_index: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: '1-2',
              project_id: '1',
              item_type: 'visualization',
              item_id: 'viz-1',
              title: '데이터 시각화',
              order_index: 2,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ],
          files: [
            {
              id: 'file-1',
              project_id: '1',
              file_name: 'survey_data.xlsx',
              file_path: '/uploads/survey_data.xlsx',
              file_type: 'xlsx',
              file_size: 1024000,
              is_compiled: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]
        },
        {
          id: '2',
          user_id: 'user-1',
          title: 'FGI 분석 프로젝트',
          description: '포커스 그룹 인터뷰 분석',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          items: [],
          files: []
        }
      ];
      setProjects(mockProjects);
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleProjectClick = (project: Project) => {
    onProjectSelect(project);
  };

  const handleFileClick = (file: ProjectFile) => {
    onFileSelect(file);
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">프로젝트</h2>
          <button
            onClick={onCreateProject}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            title="새 프로젝트"
          >
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* 프로젝트 목록 */}
      <div className="flex-1 overflow-y-auto">
        {projects.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <Folder className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">프로젝트가 없습니다</p>
            <button
              onClick={onCreateProject}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800"
            >
              새 프로젝트 만들기
            </button>
          </div>
        ) : (
          <div className="p-2">
            {projects.map((project) => (
              <div key={project.id} className="mb-2">
                {/* 프로젝트 헤더 */}
                <div
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                    selectedProject?.id === project.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleProjectClick(project)}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <Folder className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {project.title}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFolder(project.id);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {expandedFolders.has(project.id) ? (
                      <ChevronDown className="w-3 h-3 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-gray-500" />
                    )}
                  </button>
                </div>

                {/* 프로젝트 내용 (확장 시) */}
                {expandedFolders.has(project.id) && (
                  <div className="ml-6 mt-1 space-y-1">
                    {/* 파일들 */}
                    {project.files?.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center p-1 rounded cursor-pointer hover:bg-gray-50"
                        onClick={() => handleFileClick(file)}
                      >
                        <File className="w-3 h-3 text-gray-400 mr-2" />
                        <span className="text-xs text-gray-700 truncate">
                          {file.file_name}
                        </span>
                      </div>
                    ))}
                    
                    {/* 분석 항목들 */}
                    {project.items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center p-1 rounded cursor-pointer hover:bg-gray-50"
                      >
                        <div className="w-3 h-3 rounded-full bg-blue-400 mr-2"></div>
                        <span className="text-xs text-gray-700 truncate">
                          {item.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 