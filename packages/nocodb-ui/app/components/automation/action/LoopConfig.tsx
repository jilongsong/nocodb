"use client";

import { useState, useCallback } from "react";
import {
  Repeat,
  AlertCircle,
  Database,
  Hash,
  ListFilter,
} from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import type { TableInfo } from "../shared/TableSelector";
import type { FieldInfo } from "@/app/composables/useTableColumns";
import type { ActionConfig, FilterGroup } from "@/app/composables/useAutomation/types";

interface LoopConfigProps {
  config: ActionConfig;
  onChange: (updates: Partial<ActionConfig>) => void;
  tables: TableInfo[];
  currentTableId: string;
  getFieldsForTable: (tableId: string) => FieldInfo[];
  triggerFields: FieldInfo[];
}

type LoopMode = "field" | "count" | "records";

export function LoopConfig({
  config,
  onChange,
  tables,
  currentTableId,
  getFieldsForTable,
  triggerFields,
}: LoopConfigProps) {
  // 推断当前循环模式
  const getLoopMode = (): LoopMode => {
    if (config.loop_field_id) return "field";
    if (config.target_table_id && config.record_filter) return "records";
    return "count";
  };

  const [loopMode, setLoopMode] = useState<LoopMode>(getLoopMode());

  // 获取目标表的字段
  const targetFields = config.target_table_id
    ? getFieldsForTable(config.target_table_id)
    : triggerFields;

  // 处理循环模式变更
  const handleModeChange = useCallback(
    (mode: LoopMode) => {
      setLoopMode(mode);
      // 清除其他模式的配置
      if (mode === "field") {
        onChange({
          loop_field_id: config.loop_field_id || "",
          loop_limit: config.loop_limit,
          target_table_id: undefined,
          record_filter: undefined,
        });
      } else if (mode === "count") {
        onChange({
          loop_limit: config.loop_limit || 10,
          loop_field_id: undefined,
          target_table_id: undefined,
          record_filter: undefined,
        });
      } else if (mode === "records") {
        onChange({
          target_table_id: config.target_table_id || currentTableId,
          loop_limit: config.loop_limit,
          loop_field_id: undefined,
        });
      }
    },
    [config, onChange, currentTableId]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-cyan-50 to-teal-50 rounded-lg border border-cyan-100">
        <Repeat className="w-5 h-5 text-cyan-500 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-cyan-800">循环执行</p>
          <p className="text-sm text-cyan-600 mt-1">
            对多个项目重复执行后续动作。可以遍历数组字段、指定次数或符合条件的记录。
          </p>
        </div>
      </div>

      {/* Loop Mode Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">循环方式</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleModeChange("field")}
            className={`
              flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all
              ${loopMode === "field"
                ? "border-cyan-500 bg-cyan-50"
                : "border-gray-200 hover:border-gray-300"
              }
            `}
          >
            <ListFilter className={`w-5 h-5 ${loopMode === "field" ? "text-cyan-600" : "text-gray-400"}`} />
            <span className={`text-sm font-medium ${loopMode === "field" ? "text-cyan-700" : "text-gray-600"}`}>
              遍历字段
            </span>
            <span className="text-xs text-gray-500">遍历数组/多选字段</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange("count")}
            className={`
              flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all
              ${loopMode === "count"
                ? "border-cyan-500 bg-cyan-50"
                : "border-gray-200 hover:border-gray-300"
              }
            `}
          >
            <Hash className={`w-5 h-5 ${loopMode === "count" ? "text-cyan-600" : "text-gray-400"}`} />
            <span className={`text-sm font-medium ${loopMode === "count" ? "text-cyan-700" : "text-gray-600"}`}>
              指定次数
            </span>
            <span className="text-xs text-gray-500">固定循环次数</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange("records")}
            className={`
              flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all
              ${loopMode === "records"
                ? "border-cyan-500 bg-cyan-50"
                : "border-gray-200 hover:border-gray-300"
              }
            `}
          >
            <Database className={`w-5 h-5 ${loopMode === "records" ? "text-cyan-600" : "text-gray-400"}`} />
            <span className={`text-sm font-medium ${loopMode === "records" ? "text-cyan-700" : "text-gray-600"}`}>
              遍历记录
            </span>
            <span className="text-xs text-gray-500">遍历表中的记录</span>
          </button>
        </div>
      </div>

      {/* Mode-specific Config */}
      {loopMode === "field" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              选择要遍历的字段
            </label>
            <select
              value={config.loop_field_id || ""}
              onChange={(e) => onChange({ loop_field_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">选择字段</option>
              {triggerFields
                .filter((f) =>
                  ["MultiSelect", "Attachment", "LinkToAnotherRecord", "JSON"].includes(f.uidt || "")
                )
                .map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.title}
                  </option>
                ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              选择多选、附件、关联或 JSON 类型的字段
            </p>
          </div>

          {!config.loop_field_id && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-700">请选择要遍历的字段</p>
            </div>
          )}
        </div>
      )}

      {loopMode === "count" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              循环次数
            </label>
            <Input
              type="number"
              min={1}
              max={100}
              value={config.loop_limit || 10}
              onChange={(e) => onChange({ loop_limit: parseInt(e.target.value) || 10 })}
              className="w-32"
            />
            <p className="text-xs text-gray-500 mt-1">
              最大支持 100 次循环
            </p>
          </div>
        </div>
      )}

      {loopMode === "records" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              选择数据表
            </label>
            <select
              value={config.target_table_id || currentTableId}
              onChange={(e) => onChange({ target_table_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.title}
                  {table.id === currentTableId ? " (当前表)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              筛选条件 (可选)
            </label>
            <div className="p-3 bg-gray-50 border border-gray-200 border-dashed rounded-lg text-center">
              <p className="text-sm text-gray-500">点击添加筛选条件</p>
              <p className="text-xs text-gray-400 mt-1">限制循环的记录范围</p>
            </div>
          </div>
        </div>
      )}

      {/* Loop Limit (for all modes) */}
      {loopMode !== "count" && (
        <div className="pt-4 border-t border-gray-100">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              最大循环次数
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={1000}
                value={config.loop_limit || 100}
                onChange={(e) => onChange({ loop_limit: parseInt(e.target.value) || 100 })}
                className="w-32"
              />
              <span className="text-sm text-gray-500">次</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              超过此次数将停止循环，防止无限循环
            </p>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-700">
          <strong>提示：</strong>循环动作后添加的动作会对每个循环项执行。
          在循环内可使用 {"{{loop.index}}"} (索引) 和 {"{{loop.item}}"} (当前项) 变量。
        </p>
      </div>

      {/* Performance Warning */}
      {(config.loop_limit || 100) > 50 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-700">
            <p className="font-medium">性能提示</p>
            <p className="mt-0.5">
              循环次数较多时可能影响执行性能，建议合理设置限制。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoopConfig;
