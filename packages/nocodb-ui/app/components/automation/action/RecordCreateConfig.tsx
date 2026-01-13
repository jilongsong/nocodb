"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Wand2,
  ChevronDown,
  ChevronRight,
  Info,
  Trash2,
  Database,
  Globe,
  Code,
  FileJson,
} from "lucide-react";
import { TableSelector, type TableInfo } from "../shared/TableSelector";
import { FieldMappingEditor } from "../shared/FieldMappingEditor";
import { Select } from "@/app/components/ui/Select";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import type { FieldInfo } from "@/app/composables/useTableColumns";
import type { ActionConfig, FieldMapping, AutomationAction } from "@/app/composables/useAutomation/types";

interface RecordCreateConfigProps {
  config: ActionConfig;
  onChange: (config: ActionConfig) => void;
  tables: TableInfo[];
  currentTableId: string;
  getFieldsForTable: (tableId: string) => FieldInfo[];
  triggerFields: FieldInfo[];
  allActions?: AutomationAction[];
  actionIndex?: number;
}

function generateMappingId() {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
}

// 动作类型标签和图标
const actionTypeInfo: Record<string, { label: string; icon: React.ElementType }> = {
  "http.request": { label: "HTTP 请求", icon: Globe },
  "notification.webhook": { label: "Webhook", icon: Globe },
  "script.run": { label: "脚本", icon: Code },
  "record.create": { label: "创建记录", icon: Database },
};

// 数据来源选项
const dataSourceOptions = [
  { value: "trigger", label: "触发器数据", icon: Database, desc: "使用触发此自动化的记录数据" },
  { value: "action_result", label: "动作结果", icon: FileJson, desc: "使用前置动作（Webhook/脚本）的执行结果" },
];

export function RecordCreateConfig({
  config,
  onChange,
  tables,
  currentTableId,
  getFieldsForTable,
  triggerFields,
  allActions = [],
  actionIndex = 0,
}: RecordCreateConfigProps) {
  const targetTableId = config.target_table_id || currentTableId;
  const [targetFields, setTargetFields] = useState<FieldInfo[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 获取前置动作列表（可作为数据来源的动作）
  const previousActions = useMemo(() => {
    return allActions
      .filter((_, idx) => idx < actionIndex)
      .filter((a) => ["http.request", "notification.webhook", "script.run"].includes(a.type))
      .map((a, idx) => {
        const info = actionTypeInfo[a.type] || { label: a.type, icon: Code };
        return {
          value: a.id,
          label: a.title || `步骤 ${idx + 1}: ${info.label}`,
          type: a.type,
          icon: info.icon,
        };
      });
  }, [allActions, actionIndex]);

  // 当前数据来源
  const dataSource = config.data_source || "trigger";

  useEffect(() => {
    const fields = getFieldsForTable(targetTableId);
    setTargetFields(fields);
  }, [targetTableId, getFieldsForTable]);

  // 可编辑的目标字段（排除系统字段和主键）
  const editableTargetFields = useMemo(() => {
    return targetFields.filter((f) => !f.system && !f.pv);
  }, [targetFields]);

  // 计算可自动映射的字段数量
  const autoMappableCount = useMemo(() => {
    const sourceFieldNames = new Set(triggerFields.map((f) => f.title.toLowerCase()));
    return editableTargetFields.filter((f) => sourceFieldNames.has(f.title.toLowerCase())).length;
  }, [triggerFields, editableTargetFields]);

  const handleTableChange = useCallback(
    (tableId: string) => {
      onChange({
        ...config,
        target_table_id: tableId,
        field_mappings: [],
      });
    },
    [config, onChange]
  );

  const handleMappingsChange = useCallback(
    (mappings: FieldMapping[]) => {
      onChange({ ...config, field_mappings: mappings });
    },
    [config, onChange]
  );

  // 数据来源变更
  const handleDataSourceChange = useCallback(
    (source: string) => {
      onChange({
        ...config,
        data_source: source as "trigger" | "action_result",
        source_action_id: source === "action_result" ? (config.source_action_id || previousActions[0]?.value) : undefined,
        // 不自动清空映射，保留用户已配置的字段
      });
    },
    [config, onChange, previousActions]
  );

  // 来源动作变更
  const handleSourceActionChange = useCallback(
    (actionId: string) => {
      onChange({
        ...config,
        source_action_id: actionId,
        // 不自动清空映射，保留用户已配置的字段
      });
    },
    [config, onChange]
  );

  // 自动映射同名字段
  const handleAutoMap = useCallback(() => {
    const newMappings: FieldMapping[] = [];
    const sourceFieldMap = new Map(
      triggerFields.map((f) => [f.title.toLowerCase(), f])
    );

    editableTargetFields.forEach((targetField) => {
      const sourceField = sourceFieldMap.get(targetField.title.toLowerCase());
      if (sourceField) {
        newMappings.push({
          id: generateMappingId(),
          target_field_id: targetField.id,
          value_type: "field",
          source_field_id: sourceField.id,
        });
      }
    });

    if (newMappings.length > 0) {
      onChange({ ...config, field_mappings: newMappings });
    }
  }, [config, onChange, triggerFields, editableTargetFields]);

  // 复制触发器所有字段
  const handleCopyAllFields = useCallback(() => {
    const newMappings: FieldMapping[] = [];
    const targetFieldMap = new Map(
      editableTargetFields.map((f) => [f.title.toLowerCase(), f])
    );

    triggerFields.forEach((sourceField) => {
      if (sourceField.system) return;
      const targetField = targetFieldMap.get(sourceField.title.toLowerCase());
      if (targetField) {
        newMappings.push({
          id: generateMappingId(),
          target_field_id: targetField.id,
          value_type: "field",
          source_field_id: sourceField.id,
        });
      }
    });

    onChange({ ...config, field_mappings: newMappings });
  }, [config, onChange, triggerFields, editableTargetFields]);

  // 清空所有映射
  const handleClearMappings = useCallback(() => {
    onChange({ ...config, field_mappings: [] });
  }, [config, onChange]);

  const mappingCount = config.field_mappings?.length || 0;

  // 获取当前选择的来源动作信息
  const selectedSourceAction = useMemo(() => {
    return previousActions.find((a) => a.value === config.source_action_id);
  }, [previousActions, config.source_action_id]);

  return (
    <div className="space-y-4">
      {/* 目标表格选择 */}
      <TableSelector
        tables={tables}
        value={targetTableId}
        onChange={handleTableChange}
        label="目标表格"
        currentTableId={currentTableId}
      />

      {/* 数据来源选择 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">数据来源</label>
        <div className="grid grid-cols-2 gap-2">
          {dataSourceOptions.map((opt) => {
            const Icon = opt.icon;
            const isDisabled = opt.value === "action_result" && previousActions.length === 0;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={isDisabled}
                onClick={() => !isDisabled && handleDataSourceChange(opt.value)}
                className={`
                  px-3 py-2.5 rounded-lg border text-left transition-all
                  ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
                  ${dataSource === opt.value
                    ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                  }
                `}
              >
                <span className={`flex items-center gap-2 text-sm font-medium ${dataSource === opt.value ? "text-blue-700" : "text-gray-700"}`}>
                  <Icon className="w-4 h-4" />
                  {opt.label}
                </span>
                <p className="text-xs text-gray-500 mt-0.5 ml-6">
                  {isDisabled ? "需要先添加 Webhook/脚本动作" : opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 来源动作选择 - 当数据来源为动作结果时 */}
      {dataSource === "action_result" && (
        <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 space-y-2">
          <label className="flex items-center gap-1.5 text-sm font-medium text-indigo-800">
            <FileJson className="w-3.5 h-3.5" />
            选择来源动作
          </label>
          {previousActions.length > 0 ? (
            <>
              <Select
                value={config.source_action_id || ""}
                onChange={handleSourceActionChange}
                options={previousActions.map((a) => ({ value: a.value, label: a.label }))}
                placeholder="选择要使用结果的动作..."
              />
              {selectedSourceAction && (
                <div className="text-xs bg-indigo-50 border border-indigo-200 rounded-lg p-2.5 space-y-2">
                  <p className="font-medium text-indigo-800">
                    {selectedSourceAction.type === "script.run" ? "📝 脚本返回值" : "🌐 HTTP 响应"}
                  </p>
                  <div className="space-y-1 text-indigo-600">
                    <p>• <code className="bg-indigo-100 px-1 rounded">result.success</code> - 是否成功</p>
                    <p>• <code className="bg-indigo-100 px-1 rounded">result.data</code> - {selectedSourceAction.type === "script.run" ? "返回的数据" : "响应体数据"}</p>
                    <p>• <code className="bg-indigo-100 px-1 rounded">result.data.字段名</code> - 嵌套字段</p>
                    {selectedSourceAction.type !== "script.run" && (
                      <p>• <code className="bg-indigo-100 px-1 rounded">result.status</code> - HTTP 状态码</p>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-amber-600">
              没有可用的前置动作。请先添加 HTTP 请求、Webhook 或脚本动作。
            </p>
          )}
        </div>
      )}

      {/* 字段映射区域 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            字段映射
            {mappingCount > 0 && (
              <span className="ml-1.5 text-xs text-gray-400">({mappingCount})</span>
            )}
          </label>
          
          {/* 快捷操作按钮 */}
          <div className="flex items-center gap-1">
            {autoMappableCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAutoMap}
                className="text-blue-600 hover:text-blue-700 !px-2 !py-1 h-7"
                title={`自动匹配 ${autoMappableCount} 个同名字段`}
              >
                <Wand2 className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs">智能匹配</span>
                <span className="ml-1 text-[10px] bg-blue-100 text-blue-600 px-1 rounded">
                  {autoMappableCount}
                </span>
              </Button>
            )}
            {mappingCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearMappings}
                className="text-gray-400 hover:text-red-500 !px-2 !py-1 h-7"
                title="清空所有映射"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* 映射编辑器 */}
        <FieldMappingEditor
          mappings={config.field_mappings || []}
          onChange={handleMappingsChange}
          sourceFields={dataSource === "trigger" ? triggerFields : []}
          targetFields={editableTargetFields}
          mode="create"
          showVariableOption={dataSource === "action_result"}
          variablePrefix={selectedSourceAction?.type === "script.run" ? "result" : "response"}
        />

        {/* 空状态提示 */}
        {mappingCount === 0 && (
          <div className="flex items-center justify-center py-4 border border-dashed border-gray-200 rounded-lg bg-gray-50">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">尚未配置字段映射</p>
              {autoMappableCount > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoMap}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Wand2 className="w-4 h-4 mr-1.5" />
                  智能匹配 {autoMappableCount} 个字段
                </Button>
              ) : (
                <p className="text-xs text-gray-400">点击上方"添加字段"按钮</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 高级选项 */}
      <div className="border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          {showAdvanced ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          高级选项
        </button>
        
        {showAdvanced && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={config.include_metadata === true}
                onChange={(e) => onChange({ ...config, include_metadata: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>包含执行元数据</span>
            </label>
            <p className="text-xs text-gray-500 ml-6">
              自动添加 _automation_id, _executed_at 等字段（需目标表包含对应字段）
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecordCreateConfig;
