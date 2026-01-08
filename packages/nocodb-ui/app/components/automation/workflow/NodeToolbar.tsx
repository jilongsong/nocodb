"use client";

import React from "react";
import {
  Database,
  Mail,
  Globe,
  Clock,
  Code,
  Repeat,
  GitBranch,
  X,
} from "lucide-react";
import type { ActionType } from "@/app/composables/useAutomation/types";

interface NodeToolbarProps {
  onSelect: (type: ActionType) => void;
  onClose: () => void;
}

interface ActionOption {
  type: ActionType;
  label: string;
  icon: React.ElementType;
  color: string;
}

const actionOptions: ActionOption[] = [
  { type: "record.update", label: "更新记录", icon: Database, color: "bg-blue-500" },
  { type: "record.create", label: "创建记录", icon: Database, color: "bg-green-500" },
  { type: "record.delete", label: "删除记录", icon: Database, color: "bg-red-500" },
  { type: "notification.email", label: "发送邮件", icon: Mail, color: "bg-violet-500" },
  { type: "notification.webhook", label: "Webhook", icon: Globe, color: "bg-indigo-500" },
  { type: "flow.condition", label: "条件分支", icon: GitBranch, color: "bg-orange-500" },
  { type: "flow.delay", label: "延迟", icon: Clock, color: "bg-amber-500" },
  // { type: "flow.loop", label: "循环", icon: Repeat, color: "bg-cyan-500" },
  { type: "script.run", label: "脚本", icon: Code, color: "bg-slate-500" },
];

export function NodeToolbar({ onSelect, onClose }: NodeToolbarProps) {
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden w-[280px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
        <span className="text-sm font-medium text-gray-700">添加动作</span>
        <button
          onClick={onClose}
          className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action grid */}
      <div className="p-2 grid grid-cols-3 gap-1.5">
        {actionOptions.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.type}
              onClick={() => onSelect(option.type)}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className={`w-8 h-8 rounded-md ${option.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-[11px] text-gray-600 font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default NodeToolbar;
