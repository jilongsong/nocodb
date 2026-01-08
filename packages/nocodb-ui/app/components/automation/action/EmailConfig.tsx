"use client";

import type { ActionConfig } from "@/app/composables/useAutomation/types";

interface EmailConfigProps {
  config: ActionConfig;
  onChange: (config: ActionConfig) => void;
}

export function EmailConfig({ config, onChange }: EmailConfigProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">发送邮件通知给指定收件人</p>

      <div>
        <label className="block text-sm text-gray-600 mb-1">收件人</label>
        <input
          type="text"
          value={config.recipients?.join(", ") || ""}
          onChange={(e) =>
            onChange({
              ...config,
              recipients: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
            })
          }
          placeholder="email@example.com, 多个用逗号分隔"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-gray-300"
        />
        <p className="text-xs text-gray-400 mt-1">支持变量: {"{邮箱字段}"}</p>
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">主题</label>
        <input
          type="text"
          value={config.subject_template || ""}
          onChange={(e) => onChange({ ...config, subject_template: e.target.value })}
          placeholder="通知: {标题}"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-gray-300"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">内容</label>
        <textarea
          value={config.body_template || ""}
          onChange={(e) => onChange({ ...config, body_template: e.target.value })}
          placeholder="邮件正文内容，支持 {字段名} 变量"
          rows={6}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-gray-300 resize-none"
        />
      </div>

      {(!config.recipients || config.recipients.length === 0) && (
        <p className="text-xs text-gray-400">请填写收件人邮箱</p>
      )}
    </div>
  );
}

export default EmailConfig;
