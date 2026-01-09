"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Search,
  ChevronRight,
  ChevronDown,
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
  Globe,
  Repeat,
  Code,
  FileJson,
  Copy,
  Check,
} from "lucide-react";
import { Input } from "@/app/components/ui/Input";
import type {
  VariableDefinition,
  VariableCategory,
  VariableSourceType,
  VariableDataType,
  ActionResultVariable,
  FieldDefinition,
  VariablePickerConfig,
} from "@/app/composables/useAutomation/variableTypes";
import {
  getSystemVariables,
  getTriggerVariables,
  getLoopVariables,
  getRecordVariables,
  getActionResultVariables,
  getActionOutputSchema,
} from "@/app/composables/useAutomation/variableTypes";

interface EnhancedVariablePickerProps {
  onSelect: (variable: VariableDefinition, path?: string) => void;
  config: VariablePickerConfig;
  className?: string;
}

const sourceIcons: Record<VariableSourceType, React.ElementType> = {
  trigger: Zap,
  record: Database,
  previous_record: Database,
  action_result: Globe,
  system: Clock,
  loop: Repeat,
  custom: Code,
};

const typeIcons: Record<VariableDataType, React.ElementType> = {
  string: Type,
  number: Hash,
  boolean: CheckSquare,
  date: Calendar,
  datetime: Calendar,
  object: FileJson,
  array: Database,
  any: Code,
  user: User,
  email: Mail,
  url: Link,
};

const sourceLabels: Record<VariableSourceType, string> = {
  trigger: "触发器",
  record: "当前记录",
  previous_record: "更新前记录",
  action_result: "动作结果",
  system: "系统变量",
  loop: "循环上下文",
  custom: "自定义",
};

export function EnhancedVariablePicker({
  onSelect,
  config,
  className = "",
}: EnhancedVariablePickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["record", "action_result"])
  );
  const [expandedVariables, setExpandedVariables] = useState<Set<string>>(new Set());
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [customPath, setCustomPath] = useState("");
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  // 构建所有变量分类
  const categories = useMemo(() => {
    const cats: VariableCategory[] = [];

    // 记录字段
    if (config.fields?.length) {
      cats.push({
        id: "record",
        label: "当前记录",
        icon: "Database",
        description: "触发记录的字段值",
        variables: getRecordVariables(config.fields),
      });
    }

    // 触发器变量
    cats.push({
      id: "trigger",
      label: "触发器",
      icon: "Zap",
      description: "触发相关信息",
      variables: getTriggerVariables(config.triggerType),
    });

    // 动作结果变量
    if (config.showActionResults && config.availableActionResults?.length) {
      const actionVars = getActionResultVariables(
        config.availableActionResults,
        999 // 显示所有
      );
      if (actionVars.length > 0) {
        cats.push({
          id: "action_result",
          label: "动作结果",
          icon: "Globe",
          description: "前置动作的执行结果",
          variables: actionVars,
        });
      }
    }

    // 系统变量
    cats.push({
      id: "system",
      label: "系统变量",
      icon: "Clock",
      description: "系统级信息",
      variables: getSystemVariables(),
    });

    // 循环变量
    if (config.isInsideLoop) {
      cats.push({
        id: "loop",
        label: "循环上下文",
        icon: "Repeat",
        description: "循环迭代信息",
        variables: getLoopVariables(),
      });
    }

    return cats;
  }, [config]);

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

  // 按动作分组的动作结果
  const actionResultsByAction = useMemo(() => {
    if (!config.availableActionResults) return new Map();
    
    const map = new Map<string, ActionResultVariable>();
    for (const action of config.availableActionResults) {
      map.set(action.actionId, action);
    }
    return map;
  }, [config.availableActionResults]);

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const toggleVariable = useCallback((variableId: string) => {
    setExpandedVariables((prev) => {
      const next = new Set(prev);
      if (next.has(variableId)) {
        next.delete(variableId);
      } else {
        next.add(variableId);
      }
      return next;
    });
  }, []);

  const handleSelectVariable = useCallback(
    (variable: VariableDefinition, customSubPath?: string) => {
      const finalPath = customSubPath ? `${variable.name}.${customSubPath}` : undefined;
      onSelect(variable, finalPath);
    },
    [onSelect]
  );

  const handleCopyPath = useCallback((path: string) => {
    navigator.clipboard.writeText(`{{${path}}}`);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  }, []);

  const handleCustomPathSubmit = useCallback(
    (variable: VariableDefinition) => {
      if (customPath.trim()) {
        handleSelectVariable(variable, customPath.trim());
        setCustomPath("");
      }
    },
    [customPath, handleSelectVariable]
  );

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case "Database": return Database;
      case "Zap": return Zap;
      case "Globe": return Globe;
      case "Clock": return Clock;
      case "Repeat": return Repeat;
      default: return Code;
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Search */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索变量..."
            className="pl-9 text-sm h-9"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="max-h-[400px] overflow-auto">
        {filteredCategories.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            未找到匹配的变量
          </div>
        ) : (
          filteredCategories.map((category) => {
            const CategoryIcon = getCategoryIcon(category.icon);
            const isExpanded = expandedCategories.has(category.id);

            return (
              <div key={category.id} className="border-b border-gray-50 last:border-0">
                {/* Category Header */}
                <button
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50/50 hover:bg-gray-100/50 text-left transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                  <CategoryIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 flex-1">
                    {category.label}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    {category.variables.length}
                  </span>
                </button>

                {/* Variables */}
                {isExpanded && (
                  <div className="py-1">
                    {category.id === "action_result" ? (
                      // 动作结果按动作分组显示
                      <ActionResultsGroup
                        variables={category.variables}
                        actionResults={config.availableActionResults || []}
                        expandedVariables={expandedVariables}
                        onToggleVariable={toggleVariable}
                        onSelect={handleSelectVariable}
                        onCopyPath={handleCopyPath}
                        copiedPath={copiedPath}
                        customPath={customPath}
                        onCustomPathChange={setCustomPath}
                        onCustomPathSubmit={handleCustomPathSubmit}
                      />
                    ) : (
                      // 其他变量直接显示
                      category.variables.map((variable) => (
                        <VariableItem
                          key={variable.id}
                          variable={variable}
                          onSelect={handleSelectVariable}
                          onCopyPath={handleCopyPath}
                          copiedPath={copiedPath}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          点击变量插入，或使用{" "}
          <code className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-blue-600">
            {"{{变量路径}}"}
          </code>
        </p>
      </div>
    </div>
  );
}

// 动作结果分组组件
interface ActionResultsGroupProps {
  variables: VariableDefinition[];
  actionResults: ActionResultVariable[];
  expandedVariables: Set<string>;
  onToggleVariable: (id: string) => void;
  onSelect: (variable: VariableDefinition, customPath?: string) => void;
  onCopyPath: (path: string) => void;
  copiedPath: string | null;
  customPath: string;
  onCustomPathChange: (value: string) => void;
  onCustomPathSubmit: (variable: VariableDefinition) => void;
}

function ActionResultsGroup({
  variables,
  actionResults,
  expandedVariables,
  onToggleVariable,
  onSelect,
  onCopyPath,
  copiedPath,
  customPath,
  onCustomPathChange,
  onCustomPathSubmit,
}: ActionResultsGroupProps) {
  // 按动作分组
  const groupedByAction = useMemo(() => {
    const groups = new Map<string, VariableDefinition[]>();
    
    for (const variable of variables) {
      const actionId = variable.sourceActionId || "unknown";
      if (!groups.has(actionId)) {
        groups.set(actionId, []);
      }
      groups.get(actionId)!.push(variable);
    }
    
    return groups;
  }, [variables]);

  return (
    <div className="space-y-1">
      {Array.from(groupedByAction.entries()).map(([actionId, vars]) => {
        const action = actionResults.find((a) => a.actionId === actionId);
        const isExpanded = expandedVariables.has(actionId);
        const rootVar = vars.find((v) => v.name === `action_results.${actionId}`);
        const childVars = vars.filter((v) => v.name !== `action_results.${actionId}`);

        return (
          <div key={actionId} className="ml-2">
            {/* Action Header */}
            <button
              type="button"
              onClick={() => onToggleVariable(actionId)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left rounded-md"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              )}
              <Globe className="w-4 h-4 text-indigo-500" />
              <span className="text-sm text-gray-700 flex-1">
                {action?.actionLabel || actionId}
              </span>
              <span className="text-xs text-gray-400">
                {childVars.length} 个属性
              </span>
            </button>

            {/* Action Properties */}
            {isExpanded && (
              <div className="ml-6 space-y-0.5">
                {childVars.map((variable) => (
                  <VariableItem
                    key={variable.id}
                    variable={variable}
                    onSelect={onSelect}
                    onCopyPath={onCopyPath}
                    copiedPath={copiedPath}
                    compact
                  />
                ))}
                
                {/* Custom Path Input for data field */}
                {action && (
                  <div className="px-3 py-2 bg-gray-50 rounded-md mt-1">
                    <p className="text-xs text-gray-500 mb-1.5">
                      输入自定义路径访问响应数据：
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={customPath}
                        onChange={(e) => onCustomPathChange(e.target.value)}
                        placeholder="例如: data.users[0].name"
                        className="text-xs h-7 flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && rootVar) {
                            onCustomPathSubmit(rootVar);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => rootVar && onCustomPathSubmit(rootVar)}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        插入
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 变量项组件
interface VariableItemProps {
  variable: VariableDefinition;
  onSelect: (variable: VariableDefinition, customPath?: string) => void;
  onCopyPath: (path: string) => void;
  copiedPath: string | null;
  compact?: boolean;
}

function VariableItem({
  variable,
  onSelect,
  onCopyPath,
  copiedPath,
  compact = false,
}: VariableItemProps) {
  const TypeIcon = typeIcons[variable.dataType] || Code;
  const isCopied = copiedPath === variable.name;

  return (
    <div
      className={`group flex items-start gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer ${
        compact ? "ml-2" : ""
      }`}
      onClick={() => onSelect(variable)}
    >
      <TypeIcon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <code className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded truncate max-w-[200px]">
            {`{{${variable.name}}}`}
          </code>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCopyPath(variable.name);
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded transition-opacity"
            title="复制变量路径"
          >
            {isCopied ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3 text-gray-400" />
            )}
          </button>
        </div>
        
        <p className="text-sm text-gray-700 mt-0.5">{variable.label}</p>
        
        {variable.description && !compact && (
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
            {variable.description}
          </p>
        )}
        
        {variable.example !== undefined && !compact && (
          <p className="text-xs text-gray-400 mt-0.5">
            示例: <span className="text-gray-500">{String(variable.example)}</span>
          </p>
        )}
      </div>
    </div>
  );
}

export default EnhancedVariablePicker;
