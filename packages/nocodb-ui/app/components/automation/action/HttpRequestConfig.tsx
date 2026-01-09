"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Globe,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Variable,
  AlertCircle,
  Info,
  Code,
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";
import { Input } from "@/app/components/ui/Input";
import { EnhancedVariablePicker } from "../shared/EnhancedVariablePicker";
import type { ActionConfig } from "@/app/composables/useAutomation/types";
import type {
  VariablePickerConfig,
  ActionResultVariable,
  FieldDefinition,
  VariableDefinition,
} from "@/app/composables/useAutomation/variableTypes";

interface HttpRequestConfigProps {
  config: ActionConfig;
  onChange: (config: Partial<ActionConfig>) => void;
  fields?: FieldDefinition[];
  actionResults?: ActionResultVariable[];
  triggerType?: string;
  currentActionOrder?: number;
  actionId?: string;
}

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

const CONTENT_TYPES = [
  { value: "application/json", label: "JSON" },
  { value: "application/x-www-form-urlencoded", label: "Form URL Encoded" },
  { value: "multipart/form-data", label: "Form Data" },
  { value: "text/plain", label: "Plain Text" },
] as const;

export function HttpRequestConfig({
  config,
  onChange,
  fields = [],
  actionResults = [],
  triggerType,
  currentActionOrder = 0,
  actionId,
}: HttpRequestConfigProps) {
  const [showVariablePicker, setShowVariablePicker] = useState(false);
  const [showHeaders, setShowHeaders] = useState(false);
  const [showBody, setShowBody] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeField, setActiveField] = useState<"url" | "body" | "header">("body");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const headers = config.webhook_headers || {};
  const method = config.webhook_method || "GET";

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

  // 处理变量选择
  const handleVariableSelect = useCallback(
    (variable: VariableDefinition, customPath?: string) => {
      const varPath = customPath || variable.name;
      const varText = `{{${varPath}}}`;

      if (activeField === "url") {
        const currentUrl = config.webhook_url || "";
        const newUrl =
          currentUrl.slice(0, cursorPosition) +
          varText +
          currentUrl.slice(cursorPosition);
        onChange({ webhook_url: newUrl });
      } else if (activeField === "body") {
        const currentBody = config.webhook_body_template || config.body_template || "";
        const newBody =
          currentBody.slice(0, cursorPosition) +
          varText +
          currentBody.slice(cursorPosition);
        onChange({ webhook_body_template: newBody, body_template: newBody });
      }

      setShowVariablePicker(false);
    },
    [activeField, config.webhook_url, config.webhook_body_template, config.body_template, cursorPosition, onChange]
  );

  // 添加请求头
  const handleAddHeader = useCallback(() => {
    onChange({
      webhook_headers: { ...headers, "": "" },
    });
    setShowHeaders(true);
  }, [headers, onChange]);

  // 更新请求头
  const handleUpdateHeader = useCallback(
    (oldKey: string, newKey: string, value: string) => {
      const newHeaders = { ...headers };
      if (oldKey !== newKey) delete newHeaders[oldKey];
      newHeaders[newKey] = value;
      onChange({ webhook_headers: newHeaders });
    },
    [headers, onChange]
  );

  // 删除请求头
  const handleRemoveHeader = useCallback(
    (key: string) => {
      const newHeaders = { ...headers };
      delete newHeaders[key];
      onChange({ webhook_headers: newHeaders });
    },
    [headers, onChange]
  );

  // 复制 URL
  const handleCopyUrl = useCallback(() => {
    if (config.webhook_url) {
      navigator.clipboard.writeText(config.webhook_url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  }, [config.webhook_url]);

  // 获取 Content-Type
  const contentType = useMemo(() => {
    return headers["Content-Type"] || headers["content-type"] || "application/json";
  }, [headers]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
        <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
          <Globe className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-gray-800">HTTP 请求</p>
          <p className="text-sm text-gray-500 mt-0.5">
            发送 HTTP 请求到外部服务，响应数据可在后续动作中使用
          </p>
        </div>
      </div>

      {/* Request URL */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
          请求地址
          <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={config.webhook_url || ""}
              onChange={(e) => onChange({ webhook_url: e.target.value })}
              onFocus={() => setActiveField("url")}
              onSelect={(e) => setCursorPosition((e.target as HTMLInputElement).selectionStart || 0)}
              placeholder="https://api.example.com/endpoint"
              className="pr-16 font-mono text-sm"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setActiveField("url");
                  setShowVariablePicker(!showVariablePicker);
                }}
                className="p-1 text-gray-400 hover:text-blue-500"
                title="插入变量"
              >
                <Variable className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="复制 URL"
              >
                {copiedUrl ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          支持变量，如 <code className="px-1 bg-gray-100 rounded">{"{{record.api_url}}"}</code>
        </p>
      </div>

      {/* Request Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          请求方法
        </label>
        <div className="flex gap-1.5">
          {HTTP_METHODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ webhook_method: m })}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                method === m
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Request Headers */}
      <div>
        <button
          type="button"
          onClick={() => setShowHeaders(!showHeaders)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          {showHeaders ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          请求头
          <span className="text-xs text-gray-400 font-normal">
            ({Object.keys(headers).length} 个)
          </span>
        </button>

        {showHeaders && (
          <div className="mt-2 space-y-2 pl-5">
            {/* Content-Type Selector */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-500">Content-Type:</span>
              <div className="flex gap-1">
                {CONTENT_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => handleUpdateHeader("Content-Type", "Content-Type", ct.value)}
                    className={`px-2 py-0.5 text-xs rounded border ${
                      contentType === ct.value
                        ? "bg-gray-100 border-gray-300 text-gray-700"
                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Headers */}
            {Object.entries(headers)
              .filter(([key]) => key.toLowerCase() !== "content-type")
              .map(([key, value], idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={key}
                    onChange={(e) => handleUpdateHeader(key, e.target.value, value as string)}
                    placeholder="Header Name"
                    className="flex-1 text-sm"
                  />
                  <Input
                    value={value as string}
                    onChange={(e) => handleUpdateHeader(key, key, e.target.value)}
                    placeholder="Value"
                    className="flex-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveHeader(key)}
                    className="p-2 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

            <button
              type="button"
              onClick={handleAddHeader}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              添加请求头
            </button>
          </div>
        )}
      </div>

      {/* Request Body */}
      {method !== "GET" && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <button
              type="button"
              onClick={() => setShowBody(!showBody)}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {showBody ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              请求体
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

          {showBody && (
            <div className="pl-5">
              <textarea
                value={config.webhook_body_template || config.body_template || ""}
                onChange={(e) => onChange({ 
                  webhook_body_template: e.target.value,
                  body_template: e.target.value 
                })}
                onFocus={() => setActiveField("body")}
                onSelect={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart || 0)}
                placeholder={`{\n  "key": "{{variable}}"\n}`}
                rows={6}
                className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                JSON 格式，支持 <code className="px-1 bg-gray-100 rounded">{"{{变量}}"}</code> 插入动态数据
              </p>
            </div>
          )}
        </div>
      )}

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
            {/* Timeout */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                超时时间（毫秒）
              </label>
              <Input
                type="number"
                value={config.timeout_ms || 30000}
                onChange={(e) => onChange({ timeout_ms: parseInt(e.target.value, 10) || 30000 })}
                placeholder="30000"
                min={1000}
                max={120000}
              />
              <p className="text-xs text-gray-400 mt-1">默认 30 秒，最长 120 秒</p>
            </div>

            {/* Response Variable Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                响应变量名
              </label>
              <Input
                value={config.response_variable_name || ""}
                onChange={(e) => onChange({ response_variable_name: e.target.value })}
                placeholder={`http_${actionId || "request"}`}
              />
              <p className="text-xs text-gray-400 mt-1">
                自定义变量名，后续动作通过 <code className="px-1 bg-gray-100 rounded">{"{{action_results.变量名.data}}"}</code> 引用
              </p>
            </div>

            {/* Retry on Fail */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="retry_on_fail"
                checked={config.retry_on_fail || false}
                onChange={(e) => onChange({ retry_on_fail: e.target.checked })}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="retry_on_fail" className="text-sm text-gray-700">
                请求失败时自动重试
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Response Preview Info */}
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <div className="text-xs text-gray-500">
            <p className="font-medium text-gray-600 mb-1">响应数据结构</p>
            <p>执行后可通过以下路径访问响应数据：</p>
            <ul className="mt-1 space-y-0.5 list-disc list-inside">
              <li><code className="px-1 bg-white rounded">action_results.{config.response_variable_name || actionId || "http_request"}.status</code> - 状态码</li>
              <li><code className="px-1 bg-white rounded">action_results.{config.response_variable_name || actionId || "http_request"}.data</code> - 响应数据</li>
              <li><code className="px-1 bg-white rounded">action_results.{config.response_variable_name || actionId || "http_request"}.data.fieldName</code> - 具体字段</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Validation Warning */}
      {!config.webhook_url && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700">请输入请求地址</p>
        </div>
      )}
    </div>
  );
}

export default HttpRequestConfig;
