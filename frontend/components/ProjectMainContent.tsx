'use client';

import React from 'react';
import { Project, ProjectFile } from '@/lib/types';
import { FileText, BarChart3, PieChart, Download, Upload, Plus } from 'lucide-react';

interface ProjectMainContentProps {
  selectedProject?: Project;
  selectedFile?: ProjectFile;
}

export default function ProjectMainContent({
  selectedProject,
  selectedFile
}: ProjectMainContentProps) {
  if (!selectedProject) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">프로젝트를 선택하세요</h3>
          <p className="text-gray-500 text-sm">
            왼쪽 사이드바에서 프로젝트를 선택하여 시작하세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{selectedProject.title}</h1>
            {selectedProject.description && (
              <p className="text-sm text-gray-600 mt-1">{selectedProject.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
              <Upload className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto p-6">
        {selectedFile ? (
          <FileContentView file={selectedFile} />
        ) : (
          <ProjectOverview project={selectedProject} />
        )}
      </div>
    </div>
  );
}

function FileContentView({ file }: { file: ProjectFile }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <FileText className="w-5 h-5 text-gray-500 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">{file.file_name}</h2>
          </div>
          <div className="text-sm text-gray-500">
            {file.file_size ? `${(file.file_size / 1024 / 1024).toFixed(2)} MB` : '크기 정보 없음'}
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">파일 타입:</span>
              <span className="ml-2 text-gray-600">{file.file_type.toUpperCase()}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">컴파일 상태:</span>
              <span className={`ml-2 ${file.is_compiled ? 'text-green-600' : 'text-yellow-600'}`}>
                {file.is_compiled ? '완료' : '미완료'}
              </span>
            </div>
          </div>
          
          {file.description && (
            <div>
              <span className="font-medium text-gray-700 text-sm">설명:</span>
              <p className="mt-1 text-sm text-gray-600">{file.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* 파일 미리보기 영역 */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-md font-medium text-gray-900 mb-3">파일 미리보기</h3>
        <div className="bg-gray-50 rounded p-4 text-center text-gray-500">
          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">파일 미리보기 기능은 추후 구현 예정입니다</p>
        </div>
      </div>
    </div>
  );
}

function ProjectOverview({ project }: { project: Project }) {
  const stats = [
    {
      label: '분석 항목',
      value: project.items?.length || 0,
      icon: BarChart3,
      color: 'text-blue-600'
    },
    {
      label: '파일',
      value: project.files?.length || 0,
      icon: FileText,
      color: 'text-green-600'
    },
    {
      label: '시각화',
      value: project.items?.filter(item => item.item_type === 'visualization').length || 0,
      icon: PieChart,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <div className={`p-2 rounded-md bg-gray-50 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 최근 활동 */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">최근 활동</h3>
        </div>
        <div className="p-4">
          {project.items && project.items.length > 0 ? (
            <div className="space-y-3">
              {project.items.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-sm font-medium text-gray-900">{item.title}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">아직 활동이 없습니다</p>
            </div>
          )}
        </div>
      </div>

      {/* 빠른 액션 */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">빠른 액션</h3>
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center justify-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
            <Upload className="w-4 h-4 mr-2 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">파일 업로드</span>
          </button>
          <button className="flex items-center justify-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
            <Plus className="w-4 h-4 mr-2 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">새 분석</span>
          </button>
        </div>
      </div>
    </div>
  );
} 