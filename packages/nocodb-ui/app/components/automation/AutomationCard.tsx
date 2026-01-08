"use client";

import { useState } from "react";
import {
  Play,
  Pause,
  MoreHorizontal,
  Trash2,
  Copy,
  Edit,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  Calendar,
  FileEdit,
  Webhook,
  Loader2,
} from "lucide-react";
import type { Automation, TriggerType } from "@/app/composables/useAutomation/types";

interface AutomationCardProps {
  automation: Automation;
  onEdit?: (automation: Automation) => void;
  onToggleActive?: (automation: Automation, active: boolean) => void;
  onDuplicate?: (automation: Automation) => void;
  onDelete?: (automation: Automation) => void;
  onViewLogs?: (automation: Automation) => void;
}

const triggerIcons: Record<TriggerType, React.ElementType> = {
  "record.created": FileEdit,
  "record.updated": FileEdit,
  "record.deleted": Trash2,
  "field.changed": Edit,
  "button.clicked": Play,
  "form.submitted": FileEdit,
  "schedule.cron": Calendar,
  "schedule.interval": Clock,
  "webhook.received": Webhook,
};

const triggerLabels: Record<TriggerType, string> = {
  "record.created": "记录创建时",
  "record.updated": "记录更新时",
  "record.deleted": "记录删除时",
  "field.changed": "字段变化时",
  "button.clicked": "按钮点击时",
  "form.submitted": "表单提交时",
  "schedule.cron": "定时触发",
  "schedule.interval": "间隔触发",
  "webhook.received": "Webhook 触发",
};

export function AutomationCard({
  automation,
  onEdit,
  onToggleActive,
  onDuplicate,
  onDelete,
  onViewLogs,
}: AutomationCardProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const TriggerIcon = triggerIcons[automation.trigger.type] || Zap;

  const handleToggleActive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isToggling || !onToggleActive) return;
    setIsToggling(true);
    try {
      await onToggleActive(automation, !automation.is_active);
    } catch (err) {
      console.error("Toggle failed:", err);
    } finally {
      setIsToggling(false);
    }
  };
   console.log('automation', automation);
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={`
        relative bg-white border rounded-lg p-4 
        hover:shadow-md transition-all duration-200 cursor-pointer
        ${automation.is_active ? "border-gray-200" : "border-gray-100 bg-gray-50"}
      `}
      onClick={() => onEdit?.(automation)}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Trigger Icon */}
        <div
          className={`
            shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
            ${automation.is_active 
              ? "bg-blue-50 text-blue-600" 
              : "bg-gray-100 text-gray-400"
            }
          `}
        >
          <TriggerIcon className="w-5 h-5" />
        </div>

        {/* Title & Trigger Type */}
        <div className="min-w-0 flex-1">
          <h3
            className={`
              font-medium truncate
              ${automation.is_active ? "text-gray-900" : "text-gray-500"}
            `}
          >
            {automation.title}
          </h3>
          <p className="text-sm text-gray-500 truncate">
            {triggerLabels[automation.trigger.type]}
            {automation.actions.length > 0 && (
              <span className="ml-2">
                → {automation.actions.length} 个动作
              </span>
            )}
          </p>
        </div>

        {/* Status Toggle & Menu */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Status Toggle Button */}
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={isToggling}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${automation.is_active ? "bg-green-500" : "bg-gray-300"}
              ${isToggling ? "opacity-50" : ""}
            `}
          >
            {isToggling ? (
              <Loader2 className="w-4 h-4 text-white absolute left-1/2 -translate-x-1/2 animate-spin" />
            ) : (
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow
                  ${automation.is_active ? "translate-x-6" : "translate-x-1"}
                `}
              />
            )}
          </button>

          {/* Menu Button */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onEdit?.(automation);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDuplicate?.(automation);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    复制
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onViewLogs?.(automation);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    日志
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete?.(automation);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          <span>{automation.success_count || 0} 成功</span>
        </div>
        <div className="flex items-center gap-1">
          <XCircle className="w-3.5 h-3.5 text-red-500" />
          <span>{automation.error_count || 0} 失败</span>
        </div>
        {automation.last_run_at && (
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>上次: {formatDate(automation.last_run_at)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default AutomationCard;
