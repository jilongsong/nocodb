"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import {
  Globe,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Variable,
  AlertCircle,
  Info,
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

interface WebhookConfigProps {
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
  { value: "application/x-www-form-urlencoded", label: "Form" },
  { value: "text/plain", label: "Text" },
] as const;

export function WebhookConfigV2({
  config,
  onChange,
  fields = [],
  actionResults = [],
  triggerType,
  currentActionOrder = 0,
  actionId,
}: WebhookConfigProps) {
  const [showHeaders, setShowHeaders] = useState(false);
  const [showBody, setShowBody] = useState(true);
  const [activeField, setActiveField] = useState<"url" | "body" | "header">("body");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showVariablePicker, setShowVariablePicker] = useState(false);

  const urlInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const headers = config.webhook_headers || {};
  const method = config.webhook_method || "POST";

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
    [activeField, cursorPosition, config, onChange]
  );

  // 处理添加请求头
  const handleAddHeader = useCallback(() => {
    const newKey = `Header-${Object.keys(headers).length + 1}`;
    onChange({
      webhook_headers: { ...headers, [newKey]: "" },
    });
  }, [headers, onChange]);

  // 处理更新请求头
  const handleUpdateHeader = useCallback(
    (oldKey: string, newKey: string, value: string) => {
      const newHeaders = { ...headers };
      if (oldKey !== newKey) delete newHeaders[oldKey];
      newHeaders[newKey] = value;
      onChange({ webhook_headers: newHeaders });
    },
    [headers, onChange]
  );

  // 处理删除请求头
  const handleRemoveHeader = useCallback(
    (key: string) => {
      const newHeaders = { ...headers };
      delete newHeaders[key];
      onChange({ webhook_headers: newHeaders });
    },
    [headers, onChange]
  );

  // 获取当前 Content-Type
  const currentContentType = useMemo(() => {
    const ct = headers["Content-Type"] || headers["content-type"] || "application/json";
    return ct;
  }, [headers]);

  // 设置 Content-Type
  const handleSetContentType = useCallback(
    (contentType: string) => {
      const newHeaders = { ...headers };
      delete newHeaders["content-type"];
      newHeaders["Content-Type"] = contentType;
      onChange({ webhook_headers: newHeaders });
    },
    [headers, onChange]
  );

  // 记录光标位置
  const handleUrlFocus = useCallback(() => {
    setActiveField("url");
  }, []);

  const handleBodyFocus = useCallback(() => {
    setActiveField("body");
  }, []);

  const handleUrlSelect = useCallback((e: React.SyntheticEvent<HTMLInputElement>) => {
    setCursorPosition(e.currentTarget.selectionStart || 0);
  }, []);

  const handleBodySelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCursorPosition(e.currentTarget.selectionStart || 0);
  }, []);

  const isValid = !!config.webhook_url;

  return (
    <div className="space-y-5">
      {/* URL Input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Globe className="w-4 h-4 text-gray-400" />
            请求地址
            <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => {
              setActiveField("url");
              setShowVariablePicker(!showVariablePicker);
            }}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            <Variable className="w-3.5 h-3.5" />
            插入变量
          </button>
        </div>
        <div className="flex gap-2">
          <select
            value={method}
            onChange={(e) => onChange({ webhook_method: e.target.value as typeof HTTP_METHODS[number] })}
            className="h-10 px-3 text-sm font-medium border border-gray-200 rounded-lg bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {HTTP_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <Input
            ref={urlInputRef}
            value={config.webhook_url || ""}
            onChange={(e) => onChange({ webhook_url: e.target.value })}
            onFocus={handleUrlFocus}
            onSelect={handleUrlSelect}
            placeholder="https://api.example.com/webhook"
            className="flex-1 font-mono text-sm"
          />
        </div>
      </div>

      {/* Variable Picker */}
      {showVariablePicker && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <EnhancedVariablePicker
            config={variableConfig}
            onSelect={handleVariableSelect}
          />
        </div>
      )}

      {/* Content Type Quick Select */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Content-Type</label>
        <div className="flex gap-1.5">
          {CONTENT_TYPES.map((ct) => (
            <button
              key={ct.value}
              type="button"
              onClick={() => handleSetContentType(ct.value)}
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                currentContentType === ct.value
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* Headers */}
      <div>
        <button
          type="button"
          onClick={() => setShowHeaders(!showHeaders)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          {showHeaders ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          请求头
          <span className="text-xs text-gray-400 font-normal">({Object.keys(headers).length})</span>
        </button>

        {showHeaders && (
          <div className="mt-3 space-y-2 pl-5">
            {Object.entries(headers).map(([key, value], idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  value={key}
                  onChange={(e) => handleUpdateHeader(key, e.target.value, value as string)}
                  placeholder="Header Name"
                  className="w-40 text-sm font-mono"
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
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddHeader}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-3.5 h-3.5" />
              添加请求头
            </button>
          </div>
        )}
      </div>

      {/* Request Body */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setShowBody(!showBody)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {showBody ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            请求体
          </button>
          {showBody && (
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
          )}
        </div>

        {showBody && (
          <div className="relative">
            <textarea
              ref={bodyTextareaRef}
              value={config.webhook_body_template || config.body_template || ""}
              onChange={(e) => onChange({ webhook_body_template: e.target.value, body_template: e.target.value })}
              onFocus={handleBodyFocus}
              onSelect={handleBodySelect}
              placeholder={`{
  "message": "{{record.Name}}",
  "data": {{record}}
}`}
              rows={8}
              spellCheck={false}
              className="w-full px-4 py-3 text-sm font-mono leading-relaxed border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
              style={{ tabSize: 2 }}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              JSON / Text
            </div>
          </div>
        )}
      </div>

      {/* Response Info */}
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <div className="text-xs text-gray-500">
            <p className="font-medium text-gray-600 mb-1">响应数据结构</p>
            <div className="font-mono space-y-0.5">
              <div><code className="px-1 bg-white rounded">status</code> - HTTP 状态码</div>
              <div><code className="px-1 bg-white rounded">statusText</code> - 状态文本</div>
              <div><code className="px-1 bg-white rounded">data</code> - 响应数据</div>
            </div>
          </div>
        </div>
      </div>

      {/* Validation */}
      {!isValid && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700">请填写请求地址</p>
        </div>
      )}
    </div>
  );
}

export default WebhookConfigV2;
