"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Database, Mail, Clock, Code, Repeat } from "lucide-react";
import type { ActionType } from "@/app/composables/useAutomation/types";

export interface ActionNodeData {
  label: string;
  actionType: ActionType;
  description?: string;
  isConfigured?: boolean;
  order?: number;
}

interface ActionNodeProps {
  data: ActionNodeData;
  selected?: boolean;
}

const actionConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  "record": { icon: Database, color: "text-blue-600", bg: "bg-blue-500" },
  "notification": { icon: Mail, color: "text-violet-600", bg: "bg-violet-500" },
  "script": { icon: Code, color: "text-slate-600", bg: "bg-slate-500" },
  "flow.delay": { icon: Clock, color: "text-orange-600", bg: "bg-orange-500" },
  "flow.loop": { icon: Repeat, color: "text-cyan-600", bg: "bg-cyan-500" },
};

function getActionConfig(actionType: ActionType) {
  if (actionType.startsWith("record.")) return actionConfig["record"];
  if (actionType.startsWith("notification.")) return actionConfig["notification"];
  if (actionType.startsWith("script.")) return actionConfig["script"];
  if (actionType === "flow.delay") return actionConfig["flow.delay"];
  if (actionType === "flow.loop") return actionConfig["flow.loop"];
  return { icon: Database, color: "text-gray-600", bg: "bg-gray-500" };
}

function ActionNodeComponent({ data, selected }: ActionNodeProps) {
  const config = getActionConfig(data.actionType);
  const Icon = config.icon;

  return (
    <div
      className={`
        group relative w-[180px] transition-all duration-200 cursor-pointer
        ${selected ? "scale-[1.02]" : "hover:scale-[1.01]"}
      `}
    >
      {/* Top handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-gray-300 !border-[1.5px] !border-white !-top-1 group-hover:!bg-blue-500 transition-colors"
      />

      {/* Card */}
      <div
        className={`
          bg-white rounded-xl overflow-hidden
          ${selected 
            ? "shadow-lg shadow-blue-500/20 ring-2 ring-blue-500" 
            : "shadow-sm hover:shadow-md ring-1 ring-black/[0.08]"
          }
        `}
      >
        {/* Color bar */}
        <div className={`h-1 ${config.bg}`} />
        
        {/* Content */}
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-md ${config.bg}/10 flex items-center justify-center`}>
              <Icon className={`w-3.5 h-3.5 ${config.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                {data.order !== undefined ? `步骤 ${data.order + 1}` : "动作"}
              </p>
              <p className="text-[13px] font-medium text-gray-800 truncate leading-tight">{data.label}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-gray-300 !border-[1.5px] !border-white !-bottom-1 group-hover:!bg-blue-500 transition-colors"
      />
    </div>
  );
}

export const ActionNode = memo(ActionNodeComponent);
export default ActionNode;
