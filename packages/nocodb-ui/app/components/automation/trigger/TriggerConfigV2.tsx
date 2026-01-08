"use client";

import { useMemo, useState } from "react";
import {
  FileEdit,
  Trash2,
  Edit,
  Play,
  Calendar,
  Clock,
  Webhook,
  Filter,
} from "lucide-react";
import { Input } from "@/app/components/ui/Input";
import { Select } from "@/app/components/ui/Select";
import { Button } from "@/app/components/ui/Button";
import { FieldSelector } from "../shared/FieldSelector";
import type { FieldInfo } from "@/app/composables/useTableColumns";
import type {
  AutomationTrigger,
  TriggerType,
  TriggerConfig as TriggerConfigType,
} from "@/app/composables/useAutomation/types";

interface TriggerConfigV2Props {
  trigger: AutomationTrigger;
  tableId: string;
  fields: FieldInfo[];
  onChange: (updates: Partial<AutomationTrigger>) => void;
}

interface TriggerOption {
  type: TriggerType;
  label: string;
  description: string;
  icon: React.ElementType;
  category: "record" | "schedule" | "other";
  color: string;
}

const triggerOptions: TriggerOption[] = [
  {
    type: "record.created",
    label: "记录创建",
    description: "当新记录被创建时触发",
    icon: FileEdit,
    category: "record",
    color: "green",
  },
  {
    type: "record.updated",
    label: "记录更新",
    description: "当记录被更新时触发",
    icon: Edit,
    category: "record",
    color: "blue",
  },
  {
    type: "record.deleted",
    label: "记录删除",
    description: "当记录被删除时触发",
    icon: Trash2,
    category: "record",
    color: "red",
  },
  {
    type: "field.changed",
    label: "字段变化",
    description: "当特定字段的值发生变化时触发",
    icon: Edit,
    category: "record",
    color: "purple",
  },
  {
    type: "form.submitted",
    label: "表单提交",
    description: "当表单被提交时触发",
    icon: FileEdit,
    category: "record",
    color: "indigo",
  },
  {
    type: "button.clicked",
    label: "按钮点击",
    description: "当用户点击按钮时触发",
    icon: Play,
    category: "other",
    color: "orange",
  },
  {
    type: "schedule.cron",
    label: "定时触发",
    description: "按照 Cron 表达式定时触发",
    icon: Calendar,
    category: "schedule",
    color: "cyan",
  },
  {
    type: "schedule.interval",
    label: "间隔触发",
    description: "按固定时间间隔触发",
    icon: Clock,
    category: "schedule",
    color: "teal",
  },
  {
    type: "webhook.received",
    label: "Webhook",
    description: "当收到外部 Webhook 请求时触发",
    icon: Webhook,
    category: "other",
    color: "gray",
  },
];

const categoryLabels = {
  record: "记录事件",
  schedule: "定时任务",
  other: "其他",
};

// 常用 Cron 表达式
const commonCronExpressions = [
  { label: "每分钟", value: "* * * * *" },
  { label: "每小时", value: "0 * * * *" },
  { label: "每天 9:00", value: "0 9 * * *" },
  { label: "每周一 9:00", value: "0 9 * * 1" },
  { label: "每月 1 日 9:00", value: "0 9 1 * *" },
];

// 时区选项
const timezones = [
  { value: "Asia/Shanghai", label: "中国标准时间 (UTC+8)" },
  { value: "Asia/Tokyo", label: "日本标准时间 (UTC+9)" },
  { value: "America/New_York", label: "美国东部时间" },
  { value: "Europe/London", label: "伦敦时间" },
  { value: "UTC", label: "UTC" },
];

export function TriggerConfigV2({
  trigger,
  tableId,
  fields,
  onChange,
}: TriggerConfigV2Props) {
  const selectedOption = triggerOptions.find((opt) => opt.type === trigger.type);

  const triggerTypeOptions = useMemo(() => 
    triggerOptions.map((opt) => ({ value: opt.type, label: opt.label })),
    []
  );

  const handleTypeChange = (type: string) => {
    onChange({ type: type as TriggerType, config: {} });
  };

  const handleConfigChange = (updates: Partial<TriggerConfigType>) => {
    onChange({
      config: { ...trigger.config, ...updates },
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">触发器</p>
        <p className="text-sm font-medium text-gray-800 mt-0.5">{selectedOption?.label || "选择触发类型"}</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Trigger Type Selector */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">触发类型</label>
          <Select
            value={trigger.type}
            onChange={handleTypeChange}
            options={triggerTypeOptions}
            placeholder="选择触发类型"
          />
        </div>

        {/* Description */}
        {selectedOption && (
          <p className="text-sm text-gray-500">{selectedOption.description}</p>
        )}

        {/* Type-specific Config */}
        {trigger.type === "field.changed" && (
          <FieldChangedConfig
            config={trigger.config}
            fields={fields}
            onChange={handleConfigChange}
          />
        )}

        {trigger.type === "schedule.cron" && (
          <CronConfig config={trigger.config} onChange={handleConfigChange} />
        )}

        {trigger.type === "schedule.interval" && (
          <IntervalConfig config={trigger.config} onChange={handleConfigChange} />
        )}

        {trigger.type === "webhook.received" && (
          <WebhookTriggerConfig config={trigger.config} onChange={handleConfigChange} />
        )}

        {/* Conditions */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">筛选条件</span>
            </div>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 !px-2">
              + 添加
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-1">仅满足条件时触发</p>
        </div>
      </div>
    </div>
  );
}

// 字段变化配置
function FieldChangedConfig({
  config,
  fields,
  onChange,
}: {
  config: TriggerConfigType;
  fields: FieldInfo[];
  onChange: (updates: Partial<TriggerConfigType>) => void;
}) {
  const watchFields = config.watch_fields || [];

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">当选中的字段值变化时触发</p>

      <FieldSelector
        fields={fields}
        value={watchFields}
        onChange={(value) => onChange({ watch_fields: value as string[] })}
        multiple
        label="监听字段"
        placeholder="选择字段..."
        excludeTypes={["LinkToAnotherRecord", "Lookup", "Rollup", "Formula"]}
      />

      {watchFields.length === 0 && (
        <p className="text-xs text-gray-400">请选择要监听的字段</p>
      )}
    </div>
  );
}

// Cron 配置
function CronConfig({
  config,
  onChange,
}: {
  config: TriggerConfigType;
  onChange: (updates: Partial<TriggerConfigType>) => void;
}) {
  const timezoneOptions = timezones.map((tz) => ({ value: tz.value, label: tz.label }));

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">快捷选择</label>
        <div className="flex flex-wrap gap-1.5">
          {commonCronExpressions.map((expr) => (
            <Button
              key={expr.value}
              variant={config.cron_expression === expr.value ? "secondary" : "outline"}
              size="sm"
              onClick={() => onChange({ cron_expression: expr.value })}
            >
              {expr.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Cron 表达式</label>
        <Input
          value={config.cron_expression || ""}
          onChange={(e) => onChange({ cron_expression: e.target.value })}
          placeholder="0 9 * * *"
          className="font-mono"
        />
        <p className="text-xs text-gray-400 mt-1">格式: 分 时 日 月 周</p>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">时区</label>
        <Select
          value={config.timezone || "Asia/Shanghai"}
          onChange={(v) => onChange({ timezone: v })}
          options={timezoneOptions}
        />
      </div>
    </div>
  );
}

// 间隔配置
function IntervalConfig({
  config,
  onChange,
}: {
  config: TriggerConfigType;
  onChange: (updates: Partial<TriggerConfigType>) => void;
}) {
  const timezoneOptions = timezones.map((tz) => ({ value: tz.value, label: tz.label }));

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">执行间隔 (分钟)</label>
        <Input
          type="number"
          min={1}
          value={config.interval_minutes || ""}
          onChange={(e) => onChange({ interval_minutes: parseInt(e.target.value) || undefined })}
          placeholder="60"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">时区</label>
        <Select
          value={config.timezone || "Asia/Shanghai"}
          onChange={(v) => onChange({ timezone: v })}
          options={timezoneOptions}
        />
      </div>
    </div>
  );
}

// Webhook 触发器配置
function WebhookTriggerConfig({
  config,
  onChange,
}: {
  config: TriggerConfigType;
  onChange: (updates: Partial<TriggerConfigType>) => void;
}) {
  const webhookUrl = config.webhook_url || "https://your-nocodb.com/api/v1/automation/webhook/xxx";

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Webhook URL</label>
        <div className="flex gap-2">
          <Input
            value={webhookUrl}
            readOnly
            className="flex-1 font-mono text-xs bg-gray-50"
          />
          <Button
            variant="outline"
            onClick={() => navigator.clipboard.writeText(webhookUrl)}
          >
            复制
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-1">向此 URL 发送 POST 请求即可触发</p>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">密钥验证 (可选)</label>
        <Input
          type="password"
          value={config.webhook_secret || ""}
          onChange={(e) => onChange({ webhook_secret: e.target.value })}
          placeholder="设置密钥以验证请求来源"
        />
      </div>
    </div>
  );
}

export default TriggerConfigV2;
