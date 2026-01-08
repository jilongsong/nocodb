"use client";

import { useCallback } from "react";
import {
  Trash2,
  AlertCircle,
  Database,
  Mail,
  Globe,
  Clock,
  GitBranch,
  Code,
  MessageSquare,
  PlusCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Select } from "@/app/components/ui/Select";
import { RecordUpdateConfig } from "./RecordUpdateConfig";
import { RecordCreateConfig } from "./RecordCreateConfig";
import { WebhookConfig } from "./WebhookConfig";
import { EmailConfig } from "./EmailConfig";
import { DelayConfig } from "./DelayConfig";
import { ConditionBranchConfig } from "./ConditionBranchConfig";
import { LoopConfig } from "./LoopConfig";
import type { TableInfo } from "../shared/TableSelector";
import type { FieldInfo } from "@/app/composables/useTableColumns";
import type {
  AutomationAction,
  ActionType,
  ActionConfig as ActionConfigType,
  ActionErrorBehavior,
} from "@/app/composables/useAutomation/types";

interface ActionConfigV2Props {
  action: AutomationAction;
  baseId: string;
  tableId: string;
  tables: TableInfo[];
  triggerFields: FieldInfo[];
  getFieldsForTable: (tableId: string) => FieldInfo[];
  onChange: (updates: Partial<AutomationAction>) => void;
  onDelete: () => void;
}

const actionMeta: Record<ActionType, { label: string; icon: React.ElementType; color: string }> = {
  "record.update": { label: "更新记录", icon: Database, color: "blue" },
  "record.create": { label: "创建记录", icon: PlusCircle, color: "green" },
  "record.delete": { label: "删除记录", icon: Trash2, color: "red" },
  "notification.email": { label: "发送邮件", icon: Mail, color: "purple" },
  "notification.webhook": { label: "调用 Webhook", icon: Globe, color: "indigo" },
  "notification.slack": { label: "发送 Slack", icon: MessageSquare, color: "purple" },
  "notification.feishu": { label: "发送飞书", icon: MessageSquare, color: "blue" },
  "notification.dingtalk": { label: "发送钉钉", icon: MessageSquare, color: "blue" },
  "notification.wechat": { label: "发送企微", icon: MessageSquare, color: "green" },
  "script.run": { label: "运行脚本", icon: Code, color: "gray" },
  "flow.condition": { label: "条件分支", icon: GitBranch, color: "orange" },
  "flow.delay": { label: "延迟执行", icon: Clock, color: "yellow" },
  "flow.loop": { label: "循环执行", icon: Loader2, color: "cyan" },
};

const errorBehaviorOptions: { value: ActionErrorBehavior; label: string; desc: string }[] = [
  { value: "stop", label: "停止执行", desc: "终止整个自动化流程" },
  { value: "continue", label: "继续执行", desc: "忽略错误，继续下一步" },
  { value: "retry", label: "重试", desc: "重试当前动作" },
];

export function ActionConfigV2({
  action,
  baseId,
  tableId,
  tables,
  triggerFields,
  getFieldsForTable,
  onChange,
  onDelete,
}: ActionConfigV2Props) {
  const meta = actionMeta[action.type] || { label: action.type, icon: AlertCircle, color: "gray" };
  const Icon = meta.icon;

  const handleConfigChange = useCallback(
    (updates: Partial<ActionConfigType>) => {
      onChange({
        config: { ...action.config, ...updates },
      });
    },
    [action.config, onChange]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">动作配置</p>
          <p className="text-sm font-medium text-gray-800 mt-0.5">{meta.label}</p>
        </div>
        <button
          onClick={onDelete}
          className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Record Update */}
        {action.type === "record.update" && (
          <RecordUpdateConfig
            config={action.config}
            onChange={handleConfigChange}
            tables={tables}
            currentTableId={tableId}
            getFieldsForTable={getFieldsForTable}
            triggerFields={triggerFields}
          />
        )}

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

        {/* Record Delete */}
        {action.type === "record.delete" && (
          <RecordDeleteConfig
            config={action.config}
            onChange={handleConfigChange}
            tables={tables}
            currentTableId={tableId}
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

        {/* Messaging Platforms */}
        {(action.type === "notification.feishu" ||
          action.type === "notification.dingtalk" ||
          action.type === "notification.wechat" ||
          action.type === "notification.slack") && (
          <MessagingConfig
            config={action.config}
            type={action.type}
            onChange={handleConfigChange}
          />
        )}

        {/* Delay */}
        {action.type === "flow.delay" && (
          <DelayConfig config={action.config} onChange={handleConfigChange} />
        )}

        {/* Condition Branch */}
        {action.type === "flow.condition" && (
          <ConditionBranchConfig
            config={action.config}
            onChange={handleConfigChange}
            triggerFields={triggerFields}
          />
        )}

        {/* Loop */}
        {action.type === "flow.loop" && (
          <LoopConfig
            config={action.config}
            onChange={handleConfigChange}
            tables={tables}
            currentTableId={tableId}
            getFieldsForTable={getFieldsForTable}
            triggerFields={triggerFields}
          />
        )}

        {/* Script */}
        {action.type === "script.run" && (
          <ScriptConfig config={action.config} onChange={handleConfigChange} />
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

// Record Delete Config
function RecordDeleteConfig({
  config,
  onChange,
  tables,
  currentTableId,
}: {
  config: ActionConfigType;
  onChange: (updates: Partial<ActionConfigType>) => void;
  tables: TableInfo[];
  currentTableId: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
        <Trash2 className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
        <div className="text-sm text-red-700">
          <p className="font-medium">删除记录</p>
          <p className="text-red-600 mt-1">
            将删除触发此自动化的当前记录。此操作不可撤销。
          </p>
        </div>
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <p className="text-sm text-amber-700">
            确保已做好数据备份，删除操作无法恢复
          </p>
        </div>
      </div>
    </div>
  );
}

// Messaging Config (Feishu, DingTalk, WeChat, Slack)
function MessagingConfig({
  config,
  type,
  onChange,
}: {
  config: ActionConfigType;
  type: ActionType;
  onChange: (updates: Partial<ActionConfigType>) => void;
}) {
  const platforms: Record<string, { name: string; urlPlaceholder: string }> = {
    "notification.feishu": { name: "飞书", urlPlaceholder: "https://open.feishu.cn/open-apis/bot/v2/hook/xxx" },
    "notification.dingtalk": { name: "钉钉", urlPlaceholder: "https://oapi.dingtalk.com/robot/send?access_token=xxx" },
    "notification.wechat": { name: "企业微信", urlPlaceholder: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx" },
    "notification.slack": { name: "Slack", urlPlaceholder: "https://hooks.slack.com/services/xxx/xxx/xxx" },
  };

  const platform = platforms[type] || { name: "消息", urlPlaceholder: "" };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-indigo-50 rounded-lg">
        <MessageSquare className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
        <div className="text-sm text-indigo-700">
          <p className="font-medium">发送{platform.name}消息</p>
          <p className="text-indigo-600 mt-1">
            通过 Webhook 发送消息到{platform.name}群组
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Webhook URL
        </label>
        <Input
          value={config.webhook_url || ""}
          onChange={(e) => onChange({ webhook_url: e.target.value })}
          placeholder={platform.urlPlaceholder}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          消息内容
        </label>
        <textarea
          value={config.body_template || ""}
          onChange={(e) => onChange({ body_template: e.target.value })}
          placeholder={`记录 {{record.title}} 已更新\n\n变更详情：\n{{#each changes}}\n- {{field}}: {{old}} → {{new}}\n{{/each}}`}
          className="w-full h-32 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          支持变量：{"{{record.title}}"}, {"{{trigger.time}}"} 等
        </p>
      </div>

      {!config.webhook_url && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700">请配置 Webhook URL</p>
        </div>
      )}
    </div>
  );
}


// Script Config
function ScriptConfig({
  config,
  onChange,
}: {
  config: ActionConfigType;
  onChange: (updates: Partial<ActionConfigType>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-gray-100 rounded-lg">
        <Code className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
        <div className="text-sm text-gray-700">
          <p className="font-medium">运行脚本</p>
          <p className="text-gray-600 mt-1">
            执行自定义 JavaScript 脚本
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          脚本 ID
        </label>
        <Input
          value={config.script_id || ""}
          onChange={(e) => onChange({ script_id: e.target.value })}
          placeholder="选择已保存的脚本"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          脚本参数 (JSON)
        </label>
        <textarea
          value={JSON.stringify(config.script_params || {}, null, 2)}
          onChange={(e) => {
            try {
              onChange({ script_params: JSON.parse(e.target.value) });
            } catch {
              // Invalid JSON
            }
          }}
          placeholder='{\n  "param1": "value1"\n}'
          className="w-full h-24 px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:border-gray-500 focus:ring-2 focus:ring-gray-100 resize-none"
        />
      </div>
    </div>
  );
}

export default ActionConfigV2;
