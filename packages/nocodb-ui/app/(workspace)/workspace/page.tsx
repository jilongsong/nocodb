"use client";

import { useEffect, useState } from "react";
import { Plus, Download, Database, Loader2, FolderOpen, MoreHorizontal, Star, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/app/components/ui";
import { useBases } from "@/app/composables/useBases";

export default function WorkspacePage() {
  const { basesList, loadProjects, isProjectsLoading, isProjectsLoaded, createProject, navigateToProject } = useBases();
  const [isCreating, setIsCreating] = useState(false);

  // 加载项目列表
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // 创建新 Base
  const handleCreateBase = async () => {
    setIsCreating(true);
    try {
      const result = await createProject({ title: `新数据库 ${new Date().toLocaleDateString()}` });
      if (result?.id) {
        await navigateToProject({ baseId: result.id });
      }
    } finally {
      setIsCreating(false);
    }
  };

  // 只使用 isProjectsLoading，且只在首次加载时显示 loading
  const showLoading = isProjectsLoading && !isProjectsLoaded;

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-gray-900">工作区</h1>
          <p className="text-sm text-gray-500 mt-1">管理您的所有数据库项目</p>
        </div>

        {/* Quick Actions - Compact */}
        <div className="flex items-center gap-2 mb-6">
          <Button 
            variant="primary" 
            size="sm"
            onClick={handleCreateBase}
            loading={isCreating}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            新建数据库
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1.5" />
            导入
          </Button>
          <Button variant="outline" size="sm">
            <Database className="w-4 h-4 mr-1.5" />
            连接外部数据源
          </Button>
        </div>

        {/* Bases Grid */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-700">全部数据库</h2>
            <span className="text-xs text-gray-400">{basesList.length} 个项目</span>
          </div>

          {showLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin mr-2" />
              <span className="text-sm text-gray-500">加载中...</span>
            </div>
          ) : basesList.length === 0 ? (
            <EmptyState onCreateBase={handleCreateBase} isCreating={isCreating} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {basesList.map((base) => (
                <BaseCard
                  key={base.id}
                  title={base.title || "未命名"}
                  sourcesCount={base.sources?.length || 0}
                  createdAt={base.created_at}
                  onClick={() => base.id && navigateToProject({ baseId: base.id })}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BaseCard({
  title,
  sourcesCount,
  createdAt,
  onClick,
}: {
  title: string;
  sourcesCount: number;
  createdAt?: string;
  onClick: () => void;
}) {
  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-cyan-500',
  ];
  const colorIndex = title.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];

  return (
    <button
      className="group p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-left"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-md ${bgColor} flex items-center justify-center flex-shrink-0`}>
          <span className="text-white font-medium text-sm">
            {title.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 text-sm truncate pr-2">{title}</h3>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-400 flex items-center">
              <Database className="w-3 h-3 mr-1" />
              {sourcesCount} 数据源
            </span>
            {createdAt && (
              <span className="text-xs text-gray-400 flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {new Date(createdAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function EmptyState({ onCreateBase, isCreating }: { onCreateBase: () => void; isCreating: boolean }) {
  return (
    <div className="text-center py-16 px-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <Database className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-sm font-medium text-gray-900 mb-1">暂无数据库</h3>
      <p className="text-sm text-gray-500 mb-4">创建您的第一个数据库开始使用</p>
      <Button 
        variant="primary" 
        size="sm"
        onClick={onCreateBase}
        loading={isCreating}
      >
        <Plus className="w-4 h-4 mr-1.5" />
        创建数据库
      </Button>
    </div>
  );
}
