"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Download, Database, Loader2, FolderOpen } from "lucide-react";
import { Button } from "@/app/components/ui";
import { useBases } from "@/app/composables/useBases";
import { useWorkspace } from "@/app/composables/useWorkspace";

export default function WorkspacePage() {
  const router = useRouter();
  const { basesList, loadProjects, isProjectsLoading, createProject, navigateToProject } = useBases();
  const { isWorkspaceLoading } = useWorkspace();
  const [isCreating, setIsCreating] = useState(false);

  // 加载项目列表
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // 创建新 Base
  const handleCreateBase = async () => {
    setIsCreating(true);
    try {
      const result = await createProject({ title: `New Base ${Date.now()}` });
      if (result?.id) {
        await navigateToProject({ baseId: result.id });
      }
    } finally {
      setIsCreating(false);
    }
  };

  const isLoading = isProjectsLoading || isWorkspaceLoading;

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">🚀</span>
          Getting Started
        </h1>
      </div>

      {/* Actions Section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard
            icon={<Plus className="w-6 h-6 text-blue-500" />}
            title="Create New Base"
            description="Start from scratch with a new database."
            color="blue"
            onClick={handleCreateBase}
            disabled={isCreating}
          />
          <ActionCard
            icon={<Download className="w-6 h-6 text-orange-500" />}
            title="Import Data"
            description="From files and external sources."
            color="orange"
          />
          <ActionCard
            icon={<Database className="w-6 h-6 text-green-500" />}
            title="Connect External Database"
            description="Real-time connection to external databases."
            color="green"
          />
        </div>
      </section>

      {/* Bases List */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Bases</h2>
        <div className="bg-white rounded-lg border border-gray-200">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
              <p>Loading bases...</p>
            </div>
          ) : basesList.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No bases yet</p>
              <Button 
                variant="primary" 
                className="mt-4" 
                onClick={handleCreateBase}
                loading={isCreating}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create your first base
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {basesList.map((base) => (
                <button
                  key={base.id}
                  className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => base.id && navigateToProject({ baseId: base.id })}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{base.title}</h3>
                    <p className="text-sm text-gray-500">
                      {base.sources?.length || 0} source(s)
                    </p>
                  </div>
                  <div className="text-xs text-gray-400">
                    {base.created_at && new Date(base.created_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  color,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "blue" | "orange" | "green";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const borderColors = {
    blue: "hover:border-blue-300",
    orange: "hover:border-orange-300",
    green: "hover:border-green-300",
  };

  return (
    <button
      className={`p-6 bg-white rounded-lg border border-gray-200 text-left transition-all hover:shadow-md ${borderColors[color]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </button>
  );
}
