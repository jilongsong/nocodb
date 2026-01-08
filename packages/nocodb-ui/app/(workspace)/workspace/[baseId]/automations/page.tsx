"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AutomationList } from "@/app/components/automation/AutomationList";
import { AutomationEditorV3 } from "@/app/components/automation/AutomationEditorV3";
import { AutomationLogs } from "@/app/components/automation/AutomationLogs";
import { Modal } from "@/app/components/ui/Modal";
import { Button } from "@/app/components/ui/Button";
import { useAutomation } from "@/app/composables/useAutomation";
import { useTables } from "@/app/composables/useTables";
import { useMultiTableColumns, type FieldInfo } from "@/app/composables/useTableColumns";
import type { TableInfo } from "@/app/components/automation/shared/TableSelector";
import type {
  Automation,
  CreateAutomationRequest,
  UpdateAutomationRequest,
} from "@/app/composables/useAutomation/types";

type ViewMode = "list" | "create" | "edit" | "logs";

export default function AutomationsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const baseId = params.baseId as string;

  const {
    createAutomation,
    updateAutomation,
    isSaving,
  } = useAutomation(baseId);

  const { activeTables, loadProjectTables } = useTables();
  const { cache: fieldsCache, loadFieldsForTable, getFieldsForTable } = useMultiTableColumns();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [showTableSelector, setShowTableSelector] = useState(false);

  // 加载表格列表
  useEffect(() => {
    if (baseId) {
      loadProjectTables(baseId);
    }
  }, [baseId, loadProjectTables]);

  // 转换表格数据为 TableInfo 格式
  const tables: TableInfo[] = useMemo(() => {
    return activeTables.map((t) => ({
      id: t.id || "",
      title: t.title || t.table_name || "",
      table_name: t.table_name,
    }));
  }, [activeTables]);

  // 当前表格的字段
  const currentFields: FieldInfo[] = useMemo(() => {
    if (!selectedTableId) return [];
    return fieldsCache[selectedTableId] || [];
  }, [selectedTableId, fieldsCache]);

  // 当选中表格时加载字段
  useEffect(() => {
    if (selectedTableId && selectedTableId !== "default-table") {
      loadFieldsForTable(selectedTableId);
    }
  }, [selectedTableId, loadFieldsForTable]);

  // 处理 URL 参数中的 create 和 tableId
  useEffect(() => {
    const createParam = searchParams.get("create");
    const tableIdParam = searchParams.get("tableId");
    if (createParam === "true" && tableIdParam) {
      setSelectedTableId(tableIdParam);
      setViewMode("create");
    }
  }, [searchParams]);

  // 创建新自动化 - 打开表格选择器
  const handleCreateNew = useCallback(() => {
    if (activeTables.length === 1) {
      // 如果只有一个表，直接使用
      setSelectedTableId(activeTables[0].id || null);
      setSelectedAutomation(null);
      setViewMode("create");
    } else if (activeTables.length > 1) {
      // 多个表，显示选择器
      setShowTableSelector(true);
    } else {
      // 没有表，使用占位符
      setSelectedTableId("default-table");
      setSelectedAutomation(null);
      setViewMode("create");
    }
  }, [activeTables]);

  // 选择表格后创建自动化
  const handleSelectTable = useCallback((tableId: string) => {
    setSelectedTableId(tableId);
    setShowTableSelector(false);
    setSelectedAutomation(null);
    setViewMode("create");
  }, []);

  // 编辑自动化
  const handleEdit = useCallback((automation: Automation) => {
    setSelectedAutomation(automation);
    setSelectedTableId(automation.fk_model_id);
    setViewMode("edit");
  }, []);

  // 查看日志
  const handleViewLogs = useCallback((automation: Automation) => {
    setSelectedAutomation(automation);
    setViewMode("logs");
  }, []);

  // 保存自动化
  const handleSave = useCallback(
    async (data: CreateAutomationRequest | UpdateAutomationRequest) => {
      try {
        if (viewMode === "create") {
          await createAutomation(baseId, data as CreateAutomationRequest);
        } else if (viewMode === "edit" && selectedAutomation) {
          await updateAutomation(baseId, selectedAutomation.id, data as UpdateAutomationRequest);
        }
        setViewMode("list");
        setSelectedAutomation(null);
      } catch (error) {
        console.error("Save automation failed:", error);
      }
    },
    [viewMode, selectedAutomation, baseId, createAutomation, updateAutomation]
  );

  // 取消编辑
  const handleCancel = useCallback(() => {
    setViewMode("list");
    setSelectedAutomation(null);
    setSelectedTableId(null);
  }, []);

  // 关闭日志
  const handleCloseLogs = useCallback(() => {
    setViewMode("list");
    setSelectedAutomation(null);
  }, []);

  return (
    <div className="h-full">
      {viewMode === "list" && (
        <AutomationList
          baseId={baseId}
          onCreateNew={handleCreateNew}
          onEdit={handleEdit}
          onViewLogs={handleViewLogs}
        />
      )}

      {(viewMode === "create" || viewMode === "edit") && selectedTableId && (
        <AutomationEditorV3
          automation={selectedAutomation || undefined}
          tableId={selectedTableId}
          baseId={baseId}
          tables={tables}
          fields={currentFields}
          getFieldsForTable={getFieldsForTable}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
      )}

      {viewMode === "logs" && selectedAutomation && (
        <Modal
          open={true}
          onClose={handleCloseLogs}
          title="执行日志"
          size="xl"
        >
          <div className="h-[600px] -m-4">
            <AutomationLogs
              automationId={selectedAutomation.id}
              baseId={baseId}
              automationTitle={selectedAutomation.title}
            />
          </div>
        </Modal>
      )}

      {/* 表格选择器 Modal */}
      <Modal
        open={showTableSelector}
        onClose={() => setShowTableSelector(false)}
        title="选择表格"
        size="sm"
      >
        <div className="space-y-2">
          <p className="text-sm text-gray-500 mb-4">
            选择要为其创建自动化的表格：
          </p>
          {activeTables.map((table) => (
            <Button
              key={table.id}
              variant="secondary"
              className="w-full justify-start"
              onClick={() => table.id && handleSelectTable(table.id)}
            >
              {table.title || table.table_name}
            </Button>
          ))}
          {activeTables.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              暂无表格，请先创建表格
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
