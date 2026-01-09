"use client";

import { useState, useCallback, useMemo } from "react";
import { Save, ChevronLeft, Loader2 } from "lucide-react";
import { WorkflowCanvas } from "./workflow/WorkflowCanvas";
import { TriggerConfigV2 } from "./trigger/TriggerConfigV2";
import { ActionConfigV2 } from "./action/ActionConfigV2";
import type { TableInfo } from "./shared/TableSelector";
import type { FieldInfo } from "@/app/composables/useTableColumns";
import type {
  Automation,
  AutomationTrigger,
  AutomationAction,
  ActionType,
  CreateAutomationRequest,
  UpdateAutomationRequest,
} from "@/app/composables/useAutomation/types";

interface AutomationEditorV3Props {
  automation?: Automation;
  tableId: string;
  baseId: string;
  tables: TableInfo[];
  fields: FieldInfo[];
  getFieldsForTable: (tableId: string) => FieldInfo[];
  onSave: (data: CreateAutomationRequest | UpdateAutomationRequest) => Promise<void>;
  onCancel: () => void;
  onTest?: (automation: Automation) => void;
  isSaving?: boolean;
}

const defaultTrigger: AutomationTrigger = {
  id: "trigger-1",
  type: "record.created",
  config: {},
};

function generateId(prefix: string = "id"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function AutomationEditorV3({
  automation,
  tableId,
  baseId,
  tables,
  fields,
  getFieldsForTable,
  onSave,
  onCancel,
  onTest,
  isSaving = false,
}: AutomationEditorV3Props) {
  // Form state
  const [title, setTitle] = useState(automation?.title || "");
  const [description, setDescription] = useState(automation?.description || "");
  const [trigger, setTrigger] = useState<AutomationTrigger>(
    automation?.trigger || defaultTrigger
  );
  const [actions, setActions] = useState<AutomationAction[]>(
    automation?.actions || []
  );
  const [isActive, setIsActive] = useState(automation?.is_active ?? true);

  // UI state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("trigger");
  const [showSettings, setShowSettings] = useState(false);

  // Track changes
  const hasChanges = useMemo(() => {
    if (!automation) return title || actions.length > 0;
    return (
      title !== automation.title ||
      description !== automation.description ||
      JSON.stringify(trigger) !== JSON.stringify(automation.trigger) ||
      JSON.stringify(actions) !== JSON.stringify(automation.actions) ||
      isActive !== automation.is_active
    );
  }, [automation, title, description, trigger, actions, isActive]);

  // Validate
  const validate = useCallback(() => {
    if (!title.trim()) return false;
    if (!trigger.type) return false;
    if (actions.length === 0) return false;
    return true;
  }, [title, trigger, actions]);

  // Save
  const handleSave = async () => {
    if (!validate()) return;

    const data: CreateAutomationRequest | UpdateAutomationRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      fk_model_id: tableId,
      trigger: {
        type: trigger.type,
        config: trigger.config,
        conditions: trigger.conditions,
      },
      actions: actions.map((action, index) => ({
        id: action.id,  // 保留 action ID，确保脚本引用稳定
        type: action.type,
        order: index,
        config: action.config,
        on_error: action.on_error,
        retry_count: action.retry_count,
        next_action_id: action.next_action_id,
        true_branch_id: action.true_branch_id,
        false_branch_id: action.false_branch_id,
      })),
      is_active: isActive,
    };

    await onSave(data);
  };

  // Update trigger
  const handleTriggerChange = useCallback((updates: Partial<AutomationTrigger>) => {
    setTrigger((prev) => ({ ...prev, ...updates }));
  }, []);

  // Add action
  const handleAddAction = useCallback(
    (type: ActionType, afterNodeId?: string, branch?: "true" | "false") => {
      const newAction: AutomationAction = {
        id: generateId("action"),
        type,
        order: actions.length,
        config: {},
        on_error: "stop",
      };

      if (afterNodeId && branch) {
        // Add to a branch
        setActions((prev) =>
          prev.map((action) => {
            if (action.id === afterNodeId) {
              return {
                ...action,
                [branch === "true" ? "true_branch_id" : "false_branch_id"]: newAction.id,
              };
            }
            return action;
          })
        );
        setActions((prev) => [...prev, newAction]);
      } else {
        setActions((prev) => [...prev, newAction]);
      }

      setSelectedNodeId(newAction.id);
    },
    [actions.length]
  );

  // Update action
  const handleUpdateAction = useCallback((id: string, updates: Partial<AutomationAction>) => {
    setActions((prev) =>
      prev.map((action) => (action.id === id ? { ...action, ...updates } : action))
    );
  }, []);

  // Delete action
  const handleDeleteAction = useCallback(
    (id: string) => {
      setActions((prev) => prev.filter((action) => action.id !== id));
      if (selectedNodeId === id) {
        setSelectedNodeId("trigger");
      }
    },
    [selectedNodeId]
  );

  // Reorder actions
  const handleReorderActions = useCallback((newActions: AutomationAction[]) => {
    setActions(newActions.map((action, index) => ({ ...action, order: index })));
  }, []);

  // Get selected action
  const selectedAction = useMemo(() => {
    if (selectedNodeId === "trigger" || !selectedNodeId) return null;
    return actions.find((a) => a.id === selectedNodeId) || null;
  }, [actions, selectedNodeId]);

  // Get current table name
  const currentTableName = useMemo(() => {
    const table = tables.find((t) => t.id === tableId);
    return table?.title || "未知表格";
  }, [tables, tableId]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header - Simplified */}
      <header className="flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-1.5 -ml-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="h-5 w-px bg-gray-200" />
          
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="未命名自动化"
            className="font-medium text-gray-900 bg-transparent border-none focus:outline-none p-0 text-sm w-[200px]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {/* Active toggle */}
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`
              px-2.5 py-1 rounded text-xs font-medium transition-colors
              ${isActive
                ? "bg-green-50 text-green-600 hover:bg-green-100"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }
            `}
          >
            {isActive ? "启用" : "禁用"}
          </button>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges || !validate()}
            className={`
              px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5
              ${isSaving || !hasChanges || !validate()
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
              }
            `}
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            保存
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Workflow Canvas */}
        <div className="flex-1 relative">
          <WorkflowCanvas
            trigger={trigger}
            actions={actions}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onUpdateTrigger={handleTriggerChange}
            onAddAction={handleAddAction}
            onUpdateAction={handleUpdateAction}
            onDeleteAction={handleDeleteAction}
            onReorderActions={handleReorderActions}
          />
        </div>

        {/* Config Panel - Simplified */}
        <div className="w-[720px] bg-white border-l border-gray-200 flex flex-col">
          <div className="flex-1 overflow-auto">
            {selectedNodeId === "trigger" ? (
              <TriggerConfigV2
                trigger={trigger}
                tableId={tableId}
                fields={fields}
                onChange={handleTriggerChange}
              />
            ) : selectedAction ? (
              <ActionConfigV2
                action={selectedAction}
                actionIndex={actions.findIndex(a => a.id === selectedAction.id)}
                baseId={baseId}
                tableId={tableId}
                tables={tables}
                triggerFields={fields}
                triggerType={trigger.type}
                getFieldsForTable={getFieldsForTable}
                onChange={(updates) => handleUpdateAction(selectedAction.id, updates)}
                onDelete={() => handleDeleteAction(selectedAction.id)}
                allActions={actions}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p className="text-sm">点击节点进行配置</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AutomationEditorV3;
