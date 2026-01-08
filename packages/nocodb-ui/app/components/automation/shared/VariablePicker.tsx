"use client";

import { useState, useMemo } from "react";
import {
  Search,
  ChevronRight,
  Database,
  Clock,
  User,
  Zap,
  Hash,
  Type,
  Calendar,
  Mail,
  Link,
  CheckSquare,
} from "lucide-react";
import { Input } from "@/app/components/ui/Input";
import type { TemplateVariable } from "@/app/composables/useAutomation/types";

interface VariablePickerProps {
  onSelect: (variable: TemplateVariable) => void;
  fields?: FieldInfo[];
  actionResults?: ActionResultInfo[];
  tableId?: string;
  isInsideLoop?: boolean;
  triggerType?: string;
}

interface FieldInfo {
  id: string;
  title: string;
  type: string;
}

interface ActionResultInfo {
  id: string;
  label: string;
  type: string;
}

// 字段类型对应的图标
const fieldTypeIcons: Record<string, React.ElementType> = {
  text: Type,
  number: Hash,
  date: Calendar,
  email: Mail,
  url: Link,
  checkbox: CheckSquare,
  default: Database,
};

// 系统变量
const systemVariables: TemplateVariable[] = [
  {
    name: "system.now",
    label: "当前时间",
    type: "system",
    description: "自动化执行时的时间戳",
  },
  {
    name: "system.base_id",
    label: "Base ID",
    type: "system",
    description: "当前 Base 的唯一标识",
  },
  {
    name: "system.table_id",
    label: "表格 ID",
    type: "system",
    description: "当前表格的唯一标识",
  },
  {
    name: "system.automation_id",
    label: "自动化 ID",
    type: "system",
    description: "当前自动化的唯一标识",
  },
];

// 触发器变量
const triggerVariables: TemplateVariable[] = [
  {
    name: "trigger.type",
    label: "触发类型",
    type: "trigger",
    description: "触发自动化的事件类型",
  },
  {
    name: "trigger.timestamp",
    label: "触发时间",
    type: "trigger",
    description: "触发发生的时间",
  },
  {
    name: "trigger.user.id",
    label: "触发用户 ID",
    type: "trigger",
    description: "触发自动化的用户 ID",
  },
  {
    name: "trigger.user.email",
    label: "触发用户邮箱",
    type: "trigger",
    description: "触发自动化的用户邮箱",
  },
  {
    name: "trigger.user.name",
    label: "触发用户名称",
    type: "trigger",
    description: "触发自动化的用户名称",
  },
];

// 循环上下文变量
const loopVariables: TemplateVariable[] = [
  {
    name: "loop.index",
    label: "循环索引",
    type: "system",
    description: "当前循环的索引 (从 0 开始)",
  },
  {
    name: "loop.index1",
    label: "循环序号",
    type: "system",
    description: "当前循环的序号 (从 1 开始)",
  },
  {
    name: "loop.item",
    label: "当前项",
    type: "system",
    description: "当前循环迭代的项目",
  },
  {
    name: "loop.first",
    label: "是否第一项",
    type: "system",
    description: "是否为循环的第一次迭代",
  },
  {
    name: "loop.last",
    label: "是否最后一项",
    type: "system",
    description: "是否为循环的最后一次迭代",
  },
  {
    name: "loop.length",
    label: "总循环次数",
    type: "system",
    description: "循环的总次数",
  },
];

// 前一记录变量（用于更新触发器）
const previousRecordVariables: TemplateVariable[] = [
  {
    name: "previous_record",
    label: "更新前的记录",
    type: "system",
    description: "记录更新前的完整数据 (仅在更新触发器中可用)",
  },
];

export function VariablePicker({
  onSelect,
  fields = [],
  actionResults = [],
  tableId,
  isInsideLoop = false,
  triggerType,
}: VariablePickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>("record");

  // 将字段转换为变量
  const fieldVariables: TemplateVariable[] = useMemo(() => {
    return fields.map((field) => ({
      name: `record.${field.id}`,
      label: field.title,
      type: "field" as const,
      field_id: field.id,
      description: `字段值 (${field.type})`,
    }));
  }, [fields]);

  // 将动作结果转换为变量
  const actionResultVariables: TemplateVariable[] = useMemo(() => {
    return actionResults.map((result) => ({
      name: `action_results.${result.id}`,
      label: result.label,
      type: "action_result" as const,
      action_id: result.id,
      description: `动作 "${result.label}" 的执行结果`,
    }));
  }, [actionResults]);

  // 所有变量分类
  const categories = useMemo(() => {
    const cats = [
      {
        id: "record",
        label: "记录字段",
        icon: Database,
        variables: fieldVariables,
      },
      {
        id: "trigger",
        label: "触发器",
        icon: Zap,
        variables: triggerType === "record.updated" 
          ? [...triggerVariables, ...previousRecordVariables]
          : triggerVariables,
      },
      {
        id: "system",
        label: "系统",
        icon: Clock,
        variables: systemVariables,
      },
      {
        id: "action_results",
        label: "动作结果",
        icon: CheckSquare,
        variables: actionResultVariables,
      },
    ];

    // 如果在循环内，添加循环变量
    if (isInsideLoop) {
      cats.splice(2, 0, {
        id: "loop",
        label: "循环上下文",
        icon: Clock,
        variables: loopVariables,
      });
    }

    return cats.filter((cat) => cat.variables.length > 0);
  }, [fieldVariables, actionResultVariables, isInsideLoop, triggerType]);

  // 搜索过滤
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;

    const query = searchQuery.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        variables: cat.variables.filter(
          (v) =>
            v.name.toLowerCase().includes(query) ||
            v.label.toLowerCase().includes(query) ||
            v.description?.toLowerCase().includes(query)
        ),
      }))
      .filter((cat) => cat.variables.length > 0);
  }, [categories, searchQuery]);

  const handleSelectVariable = (variable: TemplateVariable) => {
    onSelect(variable);
  };

  return (
    <div className="w-72 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
      {/* Search */}
      <div className="p-2 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索变量..."
            className="pl-8 text-sm h-8"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="max-h-80 overflow-auto">
        {filteredCategories.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            未找到匹配的变量
          </div>
        ) : (
          filteredCategories.map((category) => (
            <div key={category.id}>
              {/* Category Header */}
              <button
                type="button"
                onClick={() =>
                  setExpandedCategory(
                    expandedCategory === category.id ? null : category.id
                  )
                }
                className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-left"
              >
                <ChevronRight
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    expandedCategory === category.id ? "rotate-90" : ""
                  }`}
                />
                <category.icon className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 flex-1">
                  {category.label}
                </span>
                <span className="text-xs text-gray-400">
                  {category.variables.length}
                </span>
              </button>

              {/* Variables */}
              {expandedCategory === category.id && (
                <div className="py-1">
                  {category.variables.map((variable) => (
                    <VariableItem
                      key={variable.name}
                      variable={variable}
                      onSelect={handleSelectVariable}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          使用 <code className="px-1 py-0.5 bg-gray-200 rounded">{"{variable}"}</code> 插入变量
        </p>
      </div>
    </div>
  );
}

interface VariableItemProps {
  variable: TemplateVariable;
  onSelect: (variable: TemplateVariable) => void;
}

function VariableItem({ variable, onSelect }: VariableItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(variable)}
      className="w-full flex items-start gap-2 px-3 py-2 hover:bg-blue-50 text-left"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <code className="text-xs text-blue-600 bg-blue-50 px-1 py-0.5 rounded truncate">
            {`{${variable.name}}`}
          </code>
        </div>
        <p className="text-sm text-gray-700 mt-0.5">{variable.label}</p>
        {variable.description && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {variable.description}
          </p>
        )}
      </div>
    </button>
  );
}

export default VariablePicker;
