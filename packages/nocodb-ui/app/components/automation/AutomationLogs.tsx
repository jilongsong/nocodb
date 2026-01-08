"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Loader2,
  Play,
  SkipForward,
} from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { useAutomation } from "@/app/composables/useAutomation";
import type {
  AutomationLog,
  ActionLog,
  ExecutionStatus,
} from "@/app/composables/useAutomation/types";

interface AutomationLogsProps {
  automationId: string;
  baseId: string;
  automationTitle?: string;
  onClose?: () => void;
}

const statusIcons: Record<ExecutionStatus, React.ElementType> = {
  pending: Clock,
  running: Loader2,
  success: CheckCircle2,
  failed: XCircle,
  skipped: SkipForward,
  cancelled: AlertCircle,
};

const statusColors: Record<ExecutionStatus, string> = {
  pending: "text-gray-400",
  running: "text-blue-500",
  success: "text-green-500",
  failed: "text-red-500",
  skipped: "text-gray-400",
  cancelled: "text-amber-500",
};

const statusLabels: Record<ExecutionStatus, string> = {
  pending: "等待中",
  running: "运行中",
  success: "成功",
  failed: "失败",
  skipped: "已跳过",
  cancelled: "已取消",
};

export function AutomationLogs({
  automationId,
  baseId,
  automationTitle,
  onClose,
}: AutomationLogsProps) {
  const { automationLogs, isLoadingLogs, loadAutomationLogs } = useAutomation();
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const logs = automationLogs.get(automationId) || [];

  useEffect(() => {
    if (baseId && automationId) {
      loadAutomationLogs({ baseId, automationId });
    }
  }, [baseId, automationId, loadAutomationLogs]);

  const handleRefresh = () => {
    if (baseId && automationId) {
      loadAutomationLogs({ baseId, automationId });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "-";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">执行日志</h2>
          {automationTitle && (
            <p className="text-sm text-gray-500">{automationTitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoadingLogs}
          >
            <RefreshCw
              className={`w-4 h-4 mr-1 ${isLoadingLogs ? "animate-spin" : ""}`}
            />
            刷新
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              关闭
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoadingLogs && logs.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Clock className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              暂无执行记录
            </h3>
            <p className="text-gray-500">
              自动化触发后，执行记录将显示在这里
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <LogItem
                key={log.id}
                log={log}
                isExpanded={expandedLogId === log.id}
                onToggle={() =>
                  setExpandedLogId(expandedLogId === log.id ? null : log.id)
                }
                formatDate={formatDate}
                formatDuration={formatDuration}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface LogItemProps {
  log: AutomationLog;
  isExpanded: boolean;
  onToggle: () => void;
  formatDate: (dateStr: string) => string;
  formatDuration: (ms?: number) => string;
}

function LogItem({
  log,
  isExpanded,
  onToggle,
  formatDate,
  formatDuration,
}: LogItemProps) {
  const StatusIcon = statusIcons[log.status];
  const statusColor = statusColors[log.status];

  return (
    <div className="hover:bg-gray-50">
      {/* Summary Row */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        {/* Expand Icon */}
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}

        {/* Status Icon */}
        <StatusIcon
          className={`w-5 h-5 ${statusColor} ${
            log.status === "running" ? "animate-spin" : ""
          }`}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">
              {statusLabels[log.status]}
            </span>
            <span className="text-xs text-gray-400">
              {formatDate(log.started_at)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
            <span>
              {log.action_logs?.length || 0} 个动作
            </span>
            <span>耗时 {formatDuration(log.duration_ms)}</span>
            {log.triggered_by && (
              <span>由 {log.triggered_by} 触发</span>
            )}
          </div>
        </div>

        {/* Error Badge */}
        {log.status === "failed" && log.error && (
          <span className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded-full">
            错误
          </span>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pl-12">
          {/* Error Message */}
          {log.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-sm text-red-600 font-medium">错误信息</p>
              <p className="text-sm text-red-500 mt-1">{log.error}</p>
            </div>
          )}

          {/* Trigger Data */}
          {log.trigger_data && Object.keys(log.trigger_data).length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">触发数据</p>
              <pre className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600 overflow-auto max-h-32">
                {JSON.stringify(log.trigger_data, null, 2)}
              </pre>
            </div>
          )}

          {/* Action Logs */}
          {log.action_logs && log.action_logs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">动作执行详情</p>
              <div className="space-y-2">
                {log.action_logs.map((actionLog, index) => (
                  <ActionLogItem
                    key={actionLog.id || index}
                    actionLog={actionLog}
                    index={index}
                    formatDate={formatDate}
                    formatDuration={formatDuration}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ActionLogItemProps {
  actionLog: ActionLog;
  index: number;
  formatDate: (dateStr: string) => string;
  formatDuration: (ms?: number) => string;
}

function ActionLogItem({
  actionLog,
  index,
  formatDate,
  formatDuration,
}: ActionLogItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const StatusIcon = statusIcons[actionLog.status];
  const statusColor = statusColors[actionLog.status];

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-gray-50"
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-gray-400" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-400" />
        )}

        <span className="text-xs text-gray-400 w-6">#{index + 1}</span>

        <StatusIcon
          className={`w-4 h-4 ${statusColor} ${
            actionLog.status === "running" ? "animate-spin" : ""
          }`}
        />

        <span className="flex-1 text-sm text-gray-700">
          {actionLog.action_type}
        </span>

        <span className="text-xs text-gray-400">
          {formatDuration(actionLog.duration_ms)}
        </span>
      </button>

      {isExpanded && (
        <div className="p-3 pt-0 space-y-3 border-t border-gray-100">
          {/* Error */}
          {actionLog.error && (
            <div className="p-2 bg-red-50 rounded text-xs text-red-600">
              {actionLog.error}
            </div>
          )}

          {/* Input */}
          {actionLog.input && Object.keys(actionLog.input).length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">输入</p>
              <pre className="p-2 bg-gray-50 rounded text-xs text-gray-600 overflow-auto max-h-24">
                {JSON.stringify(actionLog.input, null, 2)}
              </pre>
            </div>
          )}

          {/* Output */}
          {actionLog.output && Object.keys(actionLog.output).length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">输出</p>
              <pre className="p-2 bg-gray-50 rounded text-xs text-gray-600 overflow-auto max-h-24">
                {JSON.stringify(actionLog.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AutomationLogs;
