'use client';

import React, { useState } from 'react';
import ProjectSidebar from '@/components/ProjectSidebar';
import ProjectMainContent from '@/components/ProjectMainContent';
import ProjectLLMPanel from '@/components/ProjectLLMPanel';
import { Project, ProjectFile } from '@/lib/types';

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [selectedFile, setSelectedFile] = useState<ProjectFile | undefined>();

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
  };

  const handleFileSelect = (file: ProjectFile) => {
    setSelectedFile(file);
  };

  const handleCreateProject = () => {
    // TODO: 새 프로젝트 생성 모달 또는 페이지로 이동
    console.log('새 프로젝트 생성');
  };

  return (
    <div className="flex h-screen w-full">
      {/* 왼쪽: 프로젝트/파일 관리 */}
      <aside className="w-64 bg-gray-50 border-r h-full overflow-y-auto">
        <ProjectSidebar
          selectedProject={selectedProject}
          onProjectSelect={handleProjectSelect}
          onFileSelect={handleFileSelect}
          onCreateProject={handleCreateProject}
        />
      </aside>
      {/* 중앙: 메인 */}
      <main className="flex-1 h-full overflow-y-auto">
        <ProjectMainContent
          selectedProject={selectedProject}
          selectedFile={selectedFile}
        />
      </main>
      {/* 오른쪽: LLM 대화 */}
      <aside className="w-96 bg-gray-100 border-l h-full overflow-y-auto">
        <ProjectLLMPanel
          selectedProject={selectedProject}
          selectedFile={selectedFile}
        />
      </aside>
    </div>
  );
} 