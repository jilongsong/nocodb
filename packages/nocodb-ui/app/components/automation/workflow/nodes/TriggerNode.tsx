"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Zap } from "lucide-react";
import type { TriggerType } from "@/app/composables/useAutomation/types";

export interface TriggerNodeData {
  label: string;
  triggerType: TriggerType;
  description?: string;
  isConfigured?: boolean;
  hasConditions?: boolean;
}

interface TriggerNodeProps {
  data: TriggerNodeData;
  selected?: boolean;
}

function TriggerNodeComponent({ data, selected }: TriggerNodeProps) {
  return (
    <div
      className={`
        group relative w-[180px] transition-all duration-200 cursor-pointer
        ${selected ? "scale-[1.02]" : "hover:scale-[1.01]"}
      `}
    >
      {/* Card */}
      <div
        className={`
          bg-white rounded-xl overflow-hidden
          ${selected 
            ? "shadow-lg shadow-amber-500/20 ring-2 ring-amber-500" 
            : "shadow-sm hover:shadow-md ring-1 ring-black/[0.08]"
          }
        `}
      >
        {/* Color bar */}
        <div className="h-1 bg-amber-500" />
        
        {/* Content */}
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">触发器</p>
              <p className="text-[13px] font-medium text-gray-800 truncate leading-tight">{data.label}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-gray-300 !border-[1.5px] !border-white !-bottom-1 group-hover:!bg-amber-500 transition-colors"
      />
    </div>
  );
}

export const TriggerNode = memo(TriggerNodeComponent);
export default TriggerNode;
