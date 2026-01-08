"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ActionConfig } from "@/app/composables/useAutomation/types";

interface WebhookConfigProps {
  config: ActionConfig;
  onChange: (config: ActionConfig) => void;
}

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export function WebhookConfig({ config, onChange }: WebhookConfigProps) {
  const [showHeaders, setShowHeaders] = useState(false);
  const headers = config.webhook_headers || {};

  const handleAddHeader = () => {
    onChange({
      ...config,
      webhook_headers: { ...headers, "": "" },
    });
  };

  const handleUpdateHeader = (oldKey: string, newKey: string, value: string) => {
    const newHeaders = { ...headers };
    if (oldKey !== newKey) delete newHeaders[oldKey];
    newHeaders[newKey] = value;
    onChange({ ...config, webhook_headers: newHeaders });
  };

  const handleRemoveHeader = (key: string) => {
    const newHeaders = { ...headers };
    delete newHeaders[key];
    onChange({ ...config, webhook_headers: newHeaders });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">向外部服务发送 HTTP 请求</p>

      <div>
        <label className="block text-sm text-gray-600 mb-1">请求地址</label>
        <input
          type="text"
          value={config.webhook_url || ""}
          onChange={(e) => onChange({ ...config, webhook_url: e.target.value })}
          placeholder="https://api.example.com/webhook"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-gray-300"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">请求方法</label>
        <div className="flex gap-1">
          {HTTP_METHODS.map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => onChange({ ...config, webhook_method: method })}
              className={`px-3 py-1 text-sm rounded border ${
                (config.webhook_method || "POST") === method
                  ? "bg-gray-100 border-gray-300"
                  : "bg-white border-gray-200 hover:border-gray-300"
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowHeaders(!showHeaders)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          请求头 {showHeaders ? "▲" : "▼"}
        </button>
        
        {showHeaders && (
          <div className="mt-2 space-y-2">
            {Object.entries(headers).map(([key, value], idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={key}
                  onChange={(e) => handleUpdateHeader(key, e.target.value, value as string)}
                  placeholder="Header"
                  className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                />
                <input
                  type="text"
                  value={value as string}
                  onChange={(e) => handleUpdateHeader(key, key, e.target.value)}
                  placeholder="Value"
                  className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                />
                <button type="button" onClick={() => handleRemoveHeader(key)} className="p-1 text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button type="button" onClick={handleAddHeader} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Plus className="w-3 h-3" /> 添加
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">请求体</label>
        <textarea
          value={config.body_template || ""}
          onChange={(e) => onChange({ ...config, body_template: e.target.value })}
          placeholder='{"data": "{字段名}"}'
          rows={4}
          className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded focus:outline-none focus:border-gray-300 resize-none"
        />
        <p className="text-xs text-gray-400 mt-1">JSON 格式，支持 {"{字段名}"} 变量</p>
      </div>

      {!config.webhook_url && (
        <p className="text-xs text-gray-400">请填写请求地址</p>
      )}
    </div>
  );
}

export default WebhookConfig;
