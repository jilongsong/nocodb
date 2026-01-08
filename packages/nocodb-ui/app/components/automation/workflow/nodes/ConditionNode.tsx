"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import type { FilterGroup } from "@/app/composables/useAutomation/types";

export interface ConditionNodeData {
  label: string;
  condition?: FilterGroup;
  description?: string;
  isConfigured?: boolean;
  conditionCount?: number;
}

interface ConditionNodeProps {
  data: ConditionNodeData;
  selected?: boolean;
}

function ConditionNodeComponent({ data, selected }: ConditionNodeProps) {
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
        className="!w-2 !h-2 !bg-gray-300 !border-[1.5px] !border-white !-top-1 group-hover:!bg-orange-500 transition-colors"
      />

      {/* Card */}
      <div
        className={`
          bg-white rounded-xl overflow-hidden
          ${selected 
            ? "shadow-lg shadow-orange-500/20 ring-2 ring-orange-500" 
            : "shadow-sm hover:shadow-md ring-1 ring-black/[0.08]"
          }
        `}
      >
        {/* Color bar */}
        <div className="h-1 bg-orange-500" />
        
        {/* Content */}
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-orange-500/10 flex items-center justify-center">
              <GitBranch className="w-3.5 h-3.5 text-orange-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">条件</p>
              <p className="text-[13px] font-medium text-gray-800 truncate leading-tight">{data.label || "条件判断"}</p>
            </div>
          </div>
        </div>

        {/* Branch labels */}
        <div className="flex border-t border-gray-100 text-[10px] font-medium">
          <div className="flex-1 py-1.5 text-center text-emerald-600">是</div>
          <div className="flex-1 py-1.5 text-center text-rose-500 border-l border-gray-100">否</div>
        </div>
      </div>

      {/* True branch handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!w-2 !h-2 !bg-emerald-500 !border-[1.5px] !border-white !-bottom-1 !left-[25%] transition-colors"
      />

      {/* False branch handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!w-2 !h-2 !bg-rose-500 !border-[1.5px] !border-white !-bottom-1 !left-[75%] transition-colors"
      />
    </div>
  );
}

export const ConditionNode = memo(ConditionNodeComponent);
export default ConditionNode;
