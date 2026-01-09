"use client";

import { useState, useMemo, useCallback } from "react";
import {
  MessageSquare,
  AlertCircle,
  Variable,
  Users,
  ChevronDown,
  ChevronRight,
  Plus,
  Info,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { Input } from "@/app/components/ui/Input";
import { Button } from "@/app/components/ui/Button";
import { RecipientPicker } from "../shared/RecipientPicker";
import { EnhancedVariablePicker } from "../shared/EnhancedVariablePicker";
import type { ActionConfig, ActionType } from "@/app/composables/useAutomation/types";
import type {
  Recipient,
  RecipientPickerConfig,
  SystemUser,
  TableUserField,
  RecipientVariable,
} from "@/app/composables/useAutomation/recipientTypes";
import type {
  VariablePickerConfig,
  ActionResultVariable,
  FieldDefinition,
  VariableDefinition,
} from "@/app/composables/useAutomation/variableTypes";
import {
  deserializeRecipients,
  serializeRecipients,
} from "@/app/composables/useAutomation/recipientTypes";

interface EnhancedMessagingConfigProps {
  config: ActionConfig;
  actionType: ActionType;
  onChange: (config: Partial<ActionConfig>) => void;
  // 基础信息
  baseId: string;
  tableId: string;
  // 接收人相关
  systemUsers?: SystemUser[];
  userFields?: TableUserField[];
  recipientVariables?: RecipientVariable[];
  // 变量相关
  fields?: FieldDefinition[];
  actionResults?: ActionResultVariable[];
  triggerType?: string;
  currentActionOrder?: number;
}

interface PlatformConfig {
  name: string;
  urlPlaceholder: string;
  urlLabel: string;
  urlHint: string;
  bodyLabel: string;
  bodyPlaceholder: string;
  supportsMention: boolean;
  supportsMarkdown: boolean;
  supportsCard: boolean;
  messageTypes: { value: string; label: string }[];
}

const platformConfigs: Record<string, PlatformConfig> = {
  "notification.feishu": {
    name: "飞书",
    urlPlaceholder: "https://open.feishu.cn/open-apis/bot/v2/hook/xxx",
    urlLabel: "机器人 Webhook URL",
    urlHint: "在飞书群设置中添加自定义机器人获取",
    bodyLabel: "消息内容",
    bodyPlaceholder: "记录 {{record.title}} 已更新",
    supportsMention: true,
    supportsMarkdown: true,
    supportsCard: true,
    messageTypes: [
      { value: "text", label: "文本消息" },
      { value: "post", label: "富文本消息" },
      { value: "interactive", label: "卡片消息" },
    ],
  },
  "notification.dingtalk": {
    name: "钉钉",
    urlPlaceholder: "https://oapi.dingtalk.com/robot/send?access_token=xxx",
    urlLabel: "机器人 Webhook URL",
    urlHint: "在钉钉群设置中添加自定义机器人获取",
    bodyLabel: "消息内容",
    bodyPlaceholder: "记录 {{record.title}} 已更新",
    supportsMention: true,
    supportsMarkdown: true,
    supportsCard: false,
    messageTypes: [
      { value: "text", label: "文本消息" },
      { value: "markdown", label: "Markdown 消息" },
      { value: "actionCard", label: "卡片消息" },
    ],
  },
  "notification.wechat": {
    name: "企业微信",
    urlPlaceholder: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx",
    urlLabel: "机器人 Webhook URL",
    urlHint: "在企业微信群设置中添加群机器人获取",
    bodyLabel: "消息内容",
    bodyPlaceholder: "记录 {{record.title}} 已更新",
    supportsMention: true,
    supportsMarkdown: true,
    supportsCard: false,
    messageTypes: [
      { value: "text", label: "文本消息" },
      { value: "markdown", label: "Markdown 消息" },
      { value: "news", label: "图文消息" },
    ],
  },
  "notification.slack": {
    name: "Slack",
    urlPlaceholder: "https://hooks.slack.com/services/xxx/xxx/xxx",
    urlLabel: "Incoming Webhook URL",
    urlHint: "在 Slack App 设置中创建 Incoming Webhook",
    bodyLabel: "消息内容",
    bodyPlaceholder: "Record {{record.title}} has been updated",
    supportsMention: true,
    supportsMarkdown: true,
    supportsCard: true,
    messageTypes: [
      { value: "text", label: "Text Message" },
      { value: "blocks", label: "Block Kit" },
    ],
  },
};

export function EnhancedMessagingConfig({
  config,
  actionType,
  onChange,
  baseId,
  tableId,
  systemUsers = [],
  userFields = [],
  recipientVariables = [],
  fields = [],
  actionResults = [],
  triggerType,
  currentActionOrder = 0,
}: EnhancedMessagingConfigProps) {
  const [showVariablePicker, setShowVariablePicker] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [activeField, setActiveField] = useState<"body" | "title">("body");

  const platform = platformConfigs[actionType] || platformConfigs["notification.feishu"];
  const messageType = config.message_type || "text";

  // 接收人配置
  const recipientConfig: RecipientPickerConfig = useMemo(
    () => ({
      allowedSources: ["static", "system_user", "table_field", "variable", "trigger_user"],
      multiple: true,
      allowManualInput: true,
      systemUsers,
      userFields,
      availableVariables: recipientVariables,
      placeholder: "选择要@的用户...",
    }),
    [systemUsers, userFields, recipientVariables]
  );

  // 变量选择器配置
  const variableConfig: VariablePickerConfig = useMemo(
    () => ({
      showActionResults: true,
      availableActionResults: actionResults.filter(
        (a) => a.actionOrder < currentActionOrder
      ),
      fields,
      triggerType,
      allowDeepPath: true,
      allowArrayIndex: true,
    }),
    [actionResults, currentActionOrder, fields, triggerType]
  );

  // 解析当前的接收人
  const currentRecipients = useMemo(() => {
    if (!config.mention_users) return [];
    return deserializeRecipients(config.mention_users);
  }, [config.mention_users]);

  // 处理接收人变化
  const handleRecipientsChange = useCallback(
    (recipients: Recipient[]) => {
      onChange({
        mention_users: serializeRecipients(recipients),
      });
    },
    [onChange]
  );

  // 处理变量选择
  const handleVariableSelect = useCallback(
    (variable: VariableDefinition, customPath?: string) => {
      const varPath = customPath || variable.name;
      const varText = `{{${varPath}}}`;

      if (activeField === "body") {
        const currentBody = config.body_template || "";
        const newBody =
          currentBody.slice(0, cursorPosition) +
          varText +
          currentBody.slice(cursorPosition);
        onChange({ body_template: newBody });
      } else if (activeField === "title") {
        const currentTitle = config.title_template || "";
        const newTitle =
          currentTitle.slice(0, cursorPosition) +
          varText +
          currentTitle.slice(cursorPosition);
        onChange({ title_template: newTitle });
      }

      setShowVariablePicker(false);
    },
    [activeField, config.body_template, config.title_template, cursorPosition, onChange]
  );

  // 预览消息内容
  const previewContent = useMemo(() => {
    const body = config.body_template || "";
    // 简单的变量替换预览（使用占位符）
    return body.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const parts = path.split(".");
      const lastPart = parts[parts.length - 1];
      return `[${lastPart}]`;
    });
  }, [config.body_template]);

  return (
    <div className="space-y-5">
      {/* Platform Header */}
      <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-gray-800">发送{platform.name}消息</p>
          <p className="text-sm text-gray-500 mt-0.5">
            通过 Webhook 机器人发送消息到{platform.name}群组
          </p>
        </div>
      </div>

      {/* Webhook URL */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
          {platform.urlLabel}
          <span className="text-red-500">*</span>
        </label>
        <Input
          value={config.webhook_url || ""}
          onChange={(e) => onChange({ webhook_url: e.target.value })}
          placeholder={platform.urlPlaceholder}
          className="font-mono text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">{platform.urlHint}</p>
      </div>

      {/* Message Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          消息类型
        </label>
        <div className="flex gap-2">
          {platform.messageTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => onChange({ message_type: type.value as ActionConfig["message_type"] })}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                messageType === type.value
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Title (for card messages) */}
      {(messageType === "interactive" || messageType === "actionCard" || messageType === "news") && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            消息标题
          </label>
          <div className="relative">
            <Input
              value={config.title_template || ""}
              onChange={(e) => onChange({ title_template: e.target.value })}
              onFocus={() => setActiveField("title")}
              onSelect={(e) => setCursorPosition((e.target as HTMLInputElement).selectionStart || 0)}
              placeholder="输入消息标题..."
            />
            <button
              type="button"
              onClick={() => {
                setActiveField("title");
                setShowVariablePicker(!showVariablePicker);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-500"
              title="插入变量"
            >
              <Variable className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Message Body */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-gray-700">
            {platform.bodyLabel}
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPreview ? "隐藏预览" : "预览"}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveField("body");
                setShowVariablePicker(!showVariablePicker);
              }}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <Variable className="w-3.5 h-3.5" />
              插入变量
            </button>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={config.body_template || ""}
            onChange={(e) => onChange({ body_template: e.target.value })}
            onFocus={() => setActiveField("body")}
            onSelect={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart || 0)}
            placeholder={platform.bodyPlaceholder}
            rows={5}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
          />
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">预览效果</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {previewContent || <span className="text-gray-400">暂无内容</span>}
            </p>
          </div>
        )}

        {/* Variable Hint */}
        <div className="flex items-start gap-1.5 mt-2 text-xs text-gray-500">
          <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
          <span>
            使用 <code className="px-1 py-0.5 bg-gray-100 rounded">{"{{变量路径}}"}</code> 插入动态内容。
            例如: <code className="px-1 py-0.5 bg-gray-100 rounded">{"{{record.title}}"}</code>、
            <code className="px-1 py-0.5 bg-gray-100 rounded">{"{{action_results.http_1.data.message}}"}</code>
          </span>
        </div>
      </div>

      {/* Variable Picker Dropdown */}
      {showVariablePicker && (
        <div className="relative">
          <div className="absolute z-50 top-0 left-0 right-0">
            <EnhancedVariablePicker
              config={variableConfig}
              onSelect={handleVariableSelect}
              className="w-full"
            />
          </div>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowVariablePicker(false)}
          />
        </div>
      )}

      {/* @ Mention Users */}
      {platform.supportsMention && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Users className="w-4 h-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">@提醒用户</label>
            <span className="text-xs text-gray-400">(可选)</span>
          </div>
          <RecipientPicker
            value={currentRecipients}
            onChange={handleRecipientsChange}
            config={recipientConfig}
            baseId={baseId}
            tableId={tableId}
          />
          <p className="text-xs text-gray-400 mt-1">
            选择要在消息中 @ 提醒的用户，支持从系统用户、表格字段或变量中选择
          </p>
        </div>
      )}

      {/* Advanced Settings */}
      <div className="border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800"
        >
          {showAdvanced ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          高级设置
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-4 pl-5">
            {/* Custom Headers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                自定义请求头 (JSON)
              </label>
              <textarea
                value={
                  config.webhook_headers
                    ? JSON.stringify(config.webhook_headers, null, 2)
                    : ""
                }
                onChange={(e) => {
                  try {
                    const headers = JSON.parse(e.target.value);
                    onChange({ webhook_headers: headers });
                  } catch {
                    // Invalid JSON, keep the text
                  }
                }}
                placeholder='{"Authorization": "Bearer xxx"}'
                rows={3}
                className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:border-gray-400 resize-none"
              />
            </div>

            {/* Security Token (for DingTalk) */}
            {actionType === "notification.dingtalk" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  安全设置 - 签名密钥
                </label>
                <Input
                  type="password"
                  value={config.security_token || ""}
                  onChange={(e) => onChange({ security_token: e.target.value })}
                  placeholder="SEC..."
                  className="font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">
                  如果启用了签名校验，请填写密钥
                </p>
              </div>
            )}

            {/* Response Variable Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                结果变量名
              </label>
              <Input
                value={config.result_variable_name || ""}
                onChange={(e) => onChange({ result_variable_name: e.target.value })}
                placeholder="例如: feishu_response"
              />
              <p className="text-xs text-gray-400 mt-1">
                自定义变量名，后续动作可通过此名称引用响应数据
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Validation Warning */}
      {!config.webhook_url && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700">请配置 Webhook URL</p>
        </div>
      )}
    </div>
  );
}

export default EnhancedMessagingConfig;
