"use client";

import { useCallback, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/app/components/ui/Input";
import { Select } from "@/app/components/ui/Select";
import { Button } from "@/app/components/ui/Button";
import type { FieldInfo } from "@/app/composables/useTableColumns";
import type {
  ActionConfig,
  FilterGroup,
  FilterCondition,
  FilterOperator,
  FilterLogicalOperator,
} from "@/app/composables/useAutomation/types";

interface ConditionBranchConfigProps {
  config: ActionConfig;
  onChange: (updates: Partial<ActionConfig>) => void;
  triggerFields: FieldInfo[];
  previousActionResults?: Array<{ id: string; label: string }>;
}

function generateId(prefix: string = "id"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const operatorOptions = [
  { value: "eq", label: "等于", requiresValue: true },
  { value: "neq", label: "不等于", requiresValue: true },
  { value: "gt", label: "大于", requiresValue: true },
  { value: "gte", label: "大于等于", requiresValue: true },
  { value: "lt", label: "小于", requiresValue: true },
  { value: "lte", label: "小于等于", requiresValue: true },
  { value: "like", label: "包含", requiresValue: true },
  { value: "nlike", label: "不包含", requiresValue: true },
  { value: "is_empty", label: "为空", requiresValue: false },
  { value: "is_not_empty", label: "不为空", requiresValue: false },
];

function createEmptyGroup(): FilterGroup {
  return { id: generateId("group"), logical_op: "and", conditions: [] };
}

function createEmptyCondition(): FilterCondition {
  return { id: generateId("cond"), field_id: "", operator: "eq", value: "" };
}

export function ConditionBranchConfig({
  config,
  onChange,
  triggerFields,
}: ConditionBranchConfigProps) {
  const condition = config.condition || createEmptyGroup();

  const fieldOptions = useMemo(() => 
    triggerFields.map((f) => ({ value: f.id, label: f.title })),
    [triggerFields]
  );

  const opSelectOptions = useMemo(() => 
    operatorOptions.map((op) => ({ value: op.value, label: op.label })),
    []
  );

  const handleConditionChange = useCallback(
    (newCondition: FilterGroup | undefined) => {
      onChange({ condition: newCondition });
    },
    [onChange]
  );

  const handleAddCondition = useCallback(() => {
    handleConditionChange({
      ...condition,
      conditions: [...condition.conditions, createEmptyCondition()],
    });
  }, [condition, handleConditionChange]);

  const handleUpdateCondition = useCallback(
    (index: number, updates: Partial<FilterCondition>) => {
      const newConditions = [...condition.conditions];
      const current = newConditions[index] as FilterCondition;
      newConditions[index] = { ...current, ...updates };
      handleConditionChange({ ...condition, conditions: newConditions });
    },
    [condition, handleConditionChange]
  );

  const handleRemoveCondition = useCallback(
    (index: number) => {
      handleConditionChange({
        ...condition,
        conditions: condition.conditions.filter((_, i) => i !== index),
      });
    },
    [condition, handleConditionChange]
  );

  const handleLogicalOpChange = useCallback(
    (logical_op: FilterLogicalOperator) => {
      handleConditionChange({ ...condition, logical_op });
    },
    [condition, handleConditionChange]
  );

  return (
    <div className="space-y-4">
      {/* Header with logical operator */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">判断条件</label>
        {condition.conditions.length > 1 && (
          <Select
            value={condition.logical_op}
            onChange={(v) => handleLogicalOpChange(v as FilterLogicalOperator)}
            options={[
              { value: "and", label: "全部满足 (AND)" },
              { value: "or", label: "任一满足 (OR)" },
            ]}
            size="sm"
            className="w-36"
          />
        )}
      </div>

      {/* Conditions */}
      <div className="space-y-3">
        {condition.conditions.map((cond, index) => {
          if ("conditions" in cond) return null;
          const filterCond = cond as FilterCondition;
          const selectedOp = operatorOptions.find((op) => op.value === filterCond.operator);
          const requiresValue = selectedOp?.requiresValue ?? true;

          return (
            <div key={filterCond.id} className="flex items-center gap-2 group">
              <Select
                value={filterCond.field_id}
                onChange={(v) => handleUpdateCondition(index, { field_id: v })}
                options={fieldOptions}
                placeholder="选择字段"
                size="sm"
                className="flex-1 min-w-32"
              />

              <Select
                value={filterCond.operator}
                onChange={(v) => handleUpdateCondition(index, { operator: v as FilterOperator })}
                options={opSelectOptions}
                size="sm"
                className="w-32"
              />

              {requiresValue && (
                <Input
                  value={(filterCond.value as string) || ""}
                  onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
                  placeholder="值"
                  className="flex-1 min-w-32 !py-1.5 text-sm"
                />
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveCondition(index)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 !p-1.5"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Add button */}
      <Button variant="ghost" size="sm" onClick={handleAddCondition} className="text-blue-600 hover:text-blue-700 !px-2">
        <Plus className="w-4 h-4 mr-1" />
        添加条件
      </Button>

      {condition.conditions.length === 0 && (
        <p className="text-sm text-gray-400">添加条件来控制分支执行</p>
      )}
    </div>
  );
}

export default ConditionBranchConfig;
