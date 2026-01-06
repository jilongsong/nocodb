"use client";

import { use, useEffect, useState } from "react";
import { Plus, Download, Database, Users, Loader2, Table2, ArrowRight, Clock, Grid3X3, FileSpreadsheet } from "lucide-react";
import { Button, Modal, Input } from "@/app/components/ui";
import { useBases } from "@/app/composables/useBases";
import { useTables } from "@/app/composables/useTables";

export default function BasePage({ params }: { params: Promise<{ baseId: string }> }) {
  const { baseId } = use(params);
  const { loadProject, openedProject } = useBases();
  const { loadProjectTables, activeTables, isTablesLoading, createTable, navigateToTable } = useTables();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isBaseLoaded, setIsBaseLoaded] = useState(false);

  // 加载 Base 详情和 Tables
  useEffect(() => {
    if (baseId) {
      loadProject(baseId).then(() => setIsBaseLoaded(true));
      loadProjectTables(baseId);
    }
  }, [baseId, loadProject, loadProjectTables]);

  const base = openedProject;
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

  // 获取颜色
  const getBaseColor = () => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500'];
    const index = (base?.title?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header - Compact */}
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-10 h-10 rounded-lg ${getBaseColor()} flex items-center justify-center`}>
            <span className="text-white font-semibold">
              {(base?.title || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">
              {!isBaseLoaded ? "加载中..." : base?.title || "未命名数据库"}
            </h1>
            <p className="text-xs text-gray-500">
              {base?.sources?.length || 0} 个数据源 · {activeTables.length} 个表格
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              新建表格
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1.5" />
              导入
            </Button>
          </div>
        </div>

        {/* Stats Row - Compact */}
        {/* <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard icon={<Grid3X3 className="w-4 h-4" />} label="表格" value={activeTables.length} color="blue" />
          <StatCard icon={<Database className="w-4 h-4" />} label="数据源" value={base?.sources?.length || 0} color="green" />
          <StatCard icon={<Users className="w-4 h-4" />} label="成员" value={1} color="purple" />
        </div> */}

        {/* Tables Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-700">表格列表</h2>
          </div>

          {isTablesLoading && activeTables.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin mr-2" />
              <span className="text-sm text-gray-500">加载表格中...</span>
            </div>
          ) : activeTables.length === 0 ? (
            <EmptyTableState onCreateTable={() => setIsCreateModalOpen(true)} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {activeTables.map((table) => (
                <TableCard
                  key={table.id}
                  title={table.title || "未命名"}
                  tableName={table.table_name}
                  onClick={() => table.id && navigateToTable({ baseId, tableId: table.id })}
                />
              ))}
            </div>
          )}
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
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              取消
            </Button>
            <Button 
              variant="primary" 
              size="sm"
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

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };
  const colorClass = colors[color as keyof typeof colors] || colors.blue;

  return (
    <div className="p-3 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-md ${colorClass} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function TableCard({ title, tableName, onClick }: { title: string; tableName?: string; onClick: () => void }) {
  const colors = ['bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-rose-500', 'bg-amber-500'];
  const colorIndex = title.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];

  return (
    <button
      className="group p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-left"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-md ${bgColor} flex items-center justify-center flex-shrink-0`}>
          <FileSpreadsheet className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 text-sm truncate pr-2">{title}</h3>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
          {tableName && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{tableName}</p>
          )}
        </div>
      </div>
    </button>
  );
}

function EmptyTableState({ onCreateTable }: { onCreateTable: () => void }) {
  return (
    <div className="text-center py-12 px-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <Table2 className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-sm font-medium text-gray-900 mb-1">暂无表格</h3>
      <p className="text-sm text-gray-500 mb-4">创建您的第一个表格开始管理数据</p>
      <Button variant="primary" size="sm" onClick={onCreateTable}>
        <Plus className="w-4 h-4 mr-1.5" />
        创建表格
      </Button>
    </div>
  );
}
