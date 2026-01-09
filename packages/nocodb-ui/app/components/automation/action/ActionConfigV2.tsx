"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Trash2,
  AlertCircle,
  Mail,
  Globe,
  Code,
  MessageSquare,
  PlusCircle,
  GitBranch,
  Repeat,
  Variable,
  Edit,
  Trash,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Select } from "@/app/components/ui/Select";
import { RecordCreateConfig } from "./RecordCreateConfig";
import { WebhookConfig } from "./WebhookConfig";
import { EmailConfig } from "./EmailConfig";
import { EnhancedMessagingConfig } from "./EnhancedMessagingConfig";
import { HttpRequestConfig } from "./HttpRequestConfig";
import { ScriptConfig } from "./ScriptConfig";
import type { TableInfo } from "../shared/TableSelector";
import type { FieldInfo } from "@/app/composables/useTableColumns";
import type {
  AutomationAction,
  ActionType,
  ActionConfig as ActionConfigType,
  ActionErrorBehavior,
} from "@/app/composables/useAutomation/types";
import type {
  ActionResultVariable,
  FieldDefinition,
} from "@/app/composables/useAutomation/variableTypes";
import type {
  SystemUser,
  TableUserField,
  RecipientVariable,
} from "@/app/composables/useAutomation/recipientTypes";

interface ActionConfigV2Props {
  action: AutomationAction;
  actionIndex: number;
  baseId: string;
  tableId: string;
  tables: TableInfo[];
  triggerFields: FieldInfo[];
  triggerType?: string;
  getFieldsForTable: (tableId: string) => FieldInfo[];
  onChange: (updates: Partial<AutomationAction>) => void;
  onDelete: () => void;
  // 新增：用于增强变量和用户选择
  systemUsers?: SystemUser[];
  allActions?: AutomationAction[];
}

const actionMeta: Record<ActionType, { label: string; icon: React.ElementType; color: string }> = {
  "record.create": { label: "创建记录", icon: PlusCircle, color: "green" },
  "record.update": { label: "更新记录", icon: Edit, color: "blue" },
  "record.delete": { label: "删除记录", icon: Trash, color: "red" },
  "http.request": { label: "HTTP 请求", icon: Globe, color: "indigo" },
  "notification.email": { label: "发送邮件", icon: Mail, color: "purple" },
  "notification.webhook": { label: "调用 Webhook", icon: Globe, color: "indigo" },
  "notification.slack": { label: "发送 Slack", icon: MessageSquare, color: "purple" },
  "notification.feishu": { label: "发送飞书", icon: MessageSquare, color: "blue" },
  "notification.dingtalk": { label: "发送钉钉", icon: MessageSquare, color: "blue" },
  "notification.wechat": { label: "发送企微", icon: MessageSquare, color: "green" },
  "condition.if": { label: "条件分支", icon: GitBranch, color: "orange" },
  "loop.foreach": { label: "循环遍历", icon: Repeat, color: "cyan" },
  "variable.set": { label: "设置变量", icon: Variable, color: "purple" },
  "script.run": { label: "运行脚本", icon: Code, color: "gray" },
};

const errorBehaviorOptions: { value: ActionErrorBehavior; label: string; desc: string }[] = [
  { value: "stop", label: "停止执行", desc: "终止整个自动化流程" },
  { value: "continue", label: "继续执行", desc: "忽略错误，继续下一步" },
  { value: "retry", label: "重试", desc: "重试当前动作" },
];

// 获取动作输出 Schema
function getActionOutputSchema(actionType: ActionType): Record<string, any> {
  switch (actionType) {
    case "http.request":
    case "notification.webhook":
      return {
        status: { type: "number", description: "HTTP 状态码" },
        statusText: { type: "string", description: "状态文本" },
        headers: { type: "object", description: "响应头" },
        data: { type: "any", description: "响应数据" },
      };
    case "record.create":
      return {
        id: { type: "string", description: "新记录 ID" },
        record: { type: "object", description: "创建的记录数据" },
      };
    default:
      return { success: { type: "boolean" } };
  }
}

export function ActionConfigV2({
  action,
  actionIndex,
  baseId,
  tableId,
  tables,
  triggerFields,
  triggerType,
  getFieldsForTable,
  onChange,
  onDelete,
  systemUsers = [],
  allActions = [],
}: ActionConfigV2Props) {
  const meta = actionMeta[action.type] || { label: action.type, icon: AlertCircle, color: "gray" };
  const Icon = meta.icon;
  const [idCopied, setIdCopied] = useState(false);

  const handleCopyActionId = useCallback(() => {
    if (action.id) {
      navigator.clipboard.writeText(action.id);
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 2000);
    }
  }, [action.id]);

  const handleConfigChange = useCallback(
    (updates: Partial<ActionConfigType>) => {
      onChange({
        config: { ...action.config, ...updates },
      });
    },
    [action.config, onChange]
  );

  // 将 FieldInfo 转换为 FieldDefinition
  const fields: FieldDefinition[] = useMemo(() => {
    return triggerFields.map((f) => ({
      id: f.id,
      title: f.title,
      type: f.uidt || "text",
      uidt: f.uidt,
    }));
  }, [triggerFields]);

  // 构建前置动作的结果变量
  const actionResults: ActionResultVariable[] = useMemo(() => {
    return allActions
      .filter((_, idx) => idx < actionIndex)
      .map((a, idx) => ({
        actionId: a.id,
        actionLabel: actionMeta[a.type]?.label || a.type,
        actionType: a.type,
        actionOrder: idx,
        outputSchema: {
          type: "object" as const,
          properties: getActionOutputSchema(a.type),
        },
      }));
  }, [allActions, actionIndex]);

  // 构建用户字段列表
  const userFields: TableUserField[] = useMemo(() => {
    return triggerFields
      .filter((f) => f.uidt === "User" || f.uidt === "Email" || f.uidt === "Collaborator")
      .map((f) => ({
        fieldId: f.id,
        fieldTitle: f.title,
        tableId: tableId,
        tableName: "",
        fieldType: f.uidt === "Email" ? "email" as const : "user" as const,
        isMultiple: false,
      }));
  }, [triggerFields, tableId]);

  // 构建接收人变量列表
  const recipientVariables: RecipientVariable[] = useMemo(() => {
    const vars: RecipientVariable[] = [];
    // 从前置动作结果中提取可能的邮箱变量
    actionResults.forEach((ar) => {
      if (ar.actionType === "http.request") {
        vars.push({
          variablePath: `action_results.${ar.actionId}.data.email`,
          label: `${ar.actionLabel} 响应 - email`,
          dataType: "string" as const,
          sourceActionId: ar.actionId,
          sourceActionLabel: ar.actionLabel,
        });
      }
    });
    return vars;
  }, [actionResults]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800 mt-0.5">{meta.label}</p>
          </div>
          <button
            onClick={onDelete}
            className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        {/* Action ID */}
        {action.id && (
          <div className="mt-2 flex items-center gap-1.5 group">
            <span className="text-sm font-medium text-gray-800">当前动作ID：</span><span className="text-[12px] text-gray-800 font-mono truncate">{action.id}</span>
            <button
              type="button"
              onClick={handleCopyActionId}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-gray-500 transition-all"
              title="复制 ID"
            >
              {idCopied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Record Create */}
        {action.type === "record.create" && (
          <RecordCreateConfig
            config={action.config}
            onChange={handleConfigChange}
            tables={tables}
            currentTableId={tableId}
            getFieldsForTable={getFieldsForTable}
            triggerFields={triggerFields}
          />
        )}

        {/* Email */}
        {action.type === "notification.email" && (
          <EmailConfig config={action.config} onChange={handleConfigChange} />
        )}

        {/* Webhook */}
        {action.type === "notification.webhook" && (
          <WebhookConfig config={action.config} onChange={handleConfigChange} />
        )}

        {/* HTTP Request */}
        {action.type === "http.request" && (
          <HttpRequestConfig
            config={action.config}
            onChange={handleConfigChange}
            fields={fields}
            actionResults={actionResults}
            triggerType={triggerType}
            currentActionOrder={actionIndex}
            actionId={action.id}
          />
        )}

        {/* Messaging Platforms - Enhanced */}
        {(action.type === "notification.feishu" ||
          action.type === "notification.dingtalk" ||
          action.type === "notification.wechat" ||
          action.type === "notification.slack") && (
          <EnhancedMessagingConfig
            config={action.config}
            actionType={action.type}
            onChange={handleConfigChange}
            baseId={baseId}
            tableId={tableId}
            systemUsers={systemUsers}
            userFields={userFields}
            recipientVariables={recipientVariables}
            fields={fields}
            actionResults={actionResults}
            triggerType={triggerType}
            currentActionOrder={actionIndex}
          />
        )}

        {/* Script */}
        {action.type === "script.run" && (
          <ScriptConfig
            config={action.config}
            onChange={handleConfigChange}
            fields={fields}
            actionResults={actionResults}
            triggerType={triggerType}
            currentActionOrder={actionIndex}
            actionId={action.id}
          />
        )}

        {/* Error Handling Section */}
        <div className="pt-4 border-t border-gray-100">
          <label className="text-sm font-medium text-gray-700 mb-2 block">错误处理</label>
          <Select
            value={action.on_error || "stop"}
            onChange={(v) => onChange({ on_error: v as ActionErrorBehavior })}
            options={errorBehaviorOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
          />
        </div>
      </div>
    </div>
  );
}

export default ActionConfigV2;
