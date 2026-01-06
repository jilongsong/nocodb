"use client";

import { use, useEffect, useState } from "react";
import { Plus, Download, Database, Users, Zap, Loader2, Table2, ChevronRight } from "lucide-react";
import { Button, Modal, Input } from "@/app/components/ui";
import { useBases } from "@/app/composables/useBases";
import { useTables } from "@/app/composables/useTables";

export default function BasePage({ params }: { params: Promise<{ baseId: string }> }) {
  const { baseId } = use(params);
  const { loadProject, openedProject, isProjectsLoading } = useBases();
  const { loadProjectTables, activeTables, isTablesLoading, createTable, navigateToTable } = useTables();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // 加载 Base 详情和 Tables
  useEffect(() => {
    if (baseId) {
      loadProject(baseId);
      loadProjectTables(baseId);
    }
  }, [baseId, loadProject, loadProjectTables]);

  const base = openedProject;
  const isLoading = isProjectsLoading || !base;
  const defaultSourceId = base?.sources?.[0]?.id;

  // 创建表格
  const handleCreateTable = async () => {
    if (!newTableName.trim() || !defaultSourceId) return;
    
    setIsCreating(true);
    try {
      const result = await createTable(baseId, defaultSourceId, newTableName.trim());
      if (result?.id) {
        setIsCreateModalOpen(false);
        setNewTableName("");
        navigateToTable({ baseId, tableId: result.id });
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isLoading ? "Loading..." : base?.title || "Untitled Base"}
        </h1>
        <p className="text-gray-500 mt-1">管理您的数据库和表格</p>
      </div>

      {/* Quick Actions */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新建表格
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            导入数据
          </Button>
          <Button variant="outline">
            <Database className="w-4 h-4 mr-2" />
            连接外部数据源
          </Button>
        </div>
      </section>

      {/* Tabs Content Area */}
      <div className="bg-white rounded-lg border border-gray-200 min-h-[400px]">
        <div className="border-b border-gray-200">
          <nav className="flex gap-4 px-4">
            <TabItem active>概览</TabItem>
            <TabItem>成员</TabItem>
            <TabItem>数据源</TabItem>
            <TabItem>设置</TabItem>
          </nav>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              icon={<Database className="w-5 h-5 text-blue-500" />}
              label="表格数量"
              value={String(activeTables.length)}
            />
            <StatCard
              icon={<Users className="w-5 h-5 text-green-500" />}
              label="数据源"
              value={String(base?.sources?.length || 0)}
            />
            <StatCard
              icon={<Zap className="w-5 h-5 text-orange-500" />}
              label="自动化"
              value="0"
            />
          </div>

          <div className="mt-8">
            <h3 className="font-semibold text-gray-900 mb-4">表格列表</h3>
            {isTablesLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
                <p className="text-gray-500">加载表格中...</p>
              </div>
            ) : activeTables.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Database className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="mb-4">此 Base 中暂无表格</p>
                <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  创建第一个表格
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                {activeTables.map((table) => (
                  <button
                    key={table.id}
                    className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                    onClick={() => table.id && navigateToTable({ baseId, tableId: table.id })}
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Table2 className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{table.title}</h4>
                      <p className="text-sm text-gray-500">{table.table_name}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Table Modal */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="创建新表格"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              表格名称
            </label>
            <Input
              placeholder="输入表格名称"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTable()}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              取消
            </Button>
            <Button 
              variant="primary" 
              onClick={handleCreateTable}
              loading={isCreating}
              disabled={!newTableName.trim()}
            >
              创建
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function TabItem({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button
      className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-blue-500 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
