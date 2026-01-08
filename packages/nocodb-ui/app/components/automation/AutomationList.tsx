"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Zap, Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Modal, ConfirmModal } from "@/app/components/ui/Modal";
import { AutomationCard } from "./AutomationCard";
import { useAutomation } from "@/app/composables/useAutomation";
import type { Automation } from "@/app/composables/useAutomation/types";

interface AutomationListProps {
  baseId: string;
  tableId?: string;
  onCreateNew?: () => void;
  onEdit?: (automation: Automation) => void;
  onViewLogs?: (automation: Automation) => void;
}

export function AutomationList({
  baseId,
  tableId,
  onCreateNew,
  onEdit,
  onViewLogs,
}: AutomationListProps) {
  const {
    automationsList,
    isLoading,
    error,
    loadAutomations,
    toggleActive,
    duplicateAutomation,
    deleteAutomation,
  } = useAutomation(baseId);

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Automation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 加载自动化列表
  useEffect(() => {
    loadAutomations({ baseId, tableId });
  }, [baseId, tableId, loadAutomations]);

  // 过滤列表
  const filteredAutomations = automationsList.filter((automation) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      automation.title.toLowerCase().includes(query) ||
      automation.trigger.type.toLowerCase().includes(query)
    );
  });

  // 按表格分组 (如果没有指定 tableId)
  const groupedAutomations = tableId
    ? { [tableId]: filteredAutomations }
    : filteredAutomations.reduce((groups, automation) => {
        const key = automation.fk_model_id;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(automation);
        return groups;
      }, {} as Record<string, Automation[]>);

  // 处理删除
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteAutomation(baseId, deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete automation failed:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // 处理复制
  const handleDuplicate = async (automation: Automation) => {
    try {
      await duplicateAutomation(baseId, automation.id);
    } catch (err) {
      console.error("Duplicate automation failed:", err);
    }
  };

  // 处理切换状态
  const handleToggleActive = async (automation: Automation, active: boolean) => {
    try {
      await toggleActive(baseId, automation.id, active);
    } catch (err) {
      console.error("Toggle automation failed:", err);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">自动化</h2>
          <span className="text-sm text-gray-500">
            ({filteredAutomations.length})
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索自动化..."
              className="pl-9 w-64"
            />
          </div>

          {/* Create Button */}
          <Button onClick={onCreateNew}>
            <Plus className="w-4 h-4 mr-1" />
            创建自动化
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading && automationsList.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-red-500 mb-2">{error}</p>
            <Button
              variant="secondary"
              onClick={() => loadAutomations({ baseId, tableId })}
            >
              重试
            </Button>
          </div>
        ) : filteredAutomations.length === 0 ? (
          <EmptyState
            searchQuery={searchQuery}
            onCreateNew={onCreateNew}
          />
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedAutomations).map(([groupId, automations]) => (
              <div key={groupId}>
                {!tableId && (
                  <h3 className="text-sm font-medium text-gray-500 mb-3">
                    表格 ID: {groupId}
                  </h3>
                )}
                <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                  {automations.map((automation) => (
                    <AutomationCard
                      key={automation.id}
                      automation={automation}
                      onEdit={onEdit}
                      onToggleActive={handleToggleActive}
                      onDuplicate={handleDuplicate}
                      onDelete={setDeleteTarget}
                      onViewLogs={onViewLogs}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="删除自动化"
        message={`确定要删除自动化"${deleteTarget?.title}"吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
}

// Empty State Component
function EmptyState({
  searchQuery,
  onCreateNew,
}: {
  searchQuery: string;
  onCreateNew?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
        <Zap className="w-8 h-8 text-blue-600" />
      </div>
      {searchQuery ? (
        <>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            未找到匹配的自动化
          </h3>
          <p className="text-gray-500">
            尝试使用其他关键词搜索
          </p>
        </>
      ) : (
        <>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            还没有自动化
          </h3>
          <p className="text-gray-500 mb-4">
            创建自动化来自动执行重复性任务
          </p>
          <Button onClick={onCreateNew}>
            <Plus className="w-4 h-4 mr-1" />
            创建第一个自动化
          </Button>
        </>
      )}
    </div>
  );
}

export default AutomationList;
