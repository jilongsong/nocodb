"use client"

import type React from "react"

import { memo } from "react"
import { Handle, Position } from "@xyflow/react"
import { Database, Mail, Code } from "lucide-react"
import type { ActionType } from "@/app/composables/useAutomation/types"

export interface ActionNodeData {
  label: string
  actionType: ActionType
  description?: string
  isConfigured?: boolean
  order?: number
}

interface ActionNodeProps {
  data: ActionNodeData
  selected?: boolean
}

const actionConfig: Record<
  string,
  { icon: React.ElementType; primary: string; surface: string; border: string; glow: string }
> = {
  record: {
    icon: Database,
    primary: "rgb(59, 130, 246)", // blue-500
    surface: "rgba(59, 130, 246, 0.08)",
    border: "rgba(59, 130, 246, 0.2)",
    glow: "0 0 20px rgba(59, 130, 246, 0.15)",
  },
  notification: {
    icon: Mail,
    primary: "rgb(139, 92, 246)", // violet-500
    surface: "rgba(139, 92, 246, 0.08)",
    border: "rgba(139, 92, 246, 0.2)",
    glow: "0 0 20px rgba(139, 92, 246, 0.15)",
  },
  script: {
    icon: Code,
    primary: "rgb(100, 116, 139)", // slate-500
    surface: "rgba(100, 116, 139, 0.08)",
    border: "rgba(100, 116, 139, 0.2)",
    glow: "0 0 20px rgba(100, 116, 139, 0.15)",
  },
}

function getActionConfig(actionType: ActionType) {
  if (actionType.startsWith("record.")) return actionConfig["record"]
  if (actionType.startsWith("notification.")) return actionConfig["notification"]
  if (actionType.startsWith("script.")) return actionConfig["script"]
  return {
    icon: Database,
    primary: "rgb(107, 114, 128)",
    surface: "rgba(107, 114, 128, 0.08)",
    border: "rgba(107, 114, 128, 0.2)",
    glow: "0 0 20px rgba(107, 114, 128, 0.15)",
  }
}

function ActionNodeComponent({ data, selected }: ActionNodeProps) {
  const config = getActionConfig(data.actionType)
  const Icon = config.icon

  return (
    <div className="group relative w-[220px] transition-transform duration-200 hover:scale-[1.01]">
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: selected ? config.primary : "rgb(203, 213, 225)",
          boxShadow: selected ? config.glow : "none",
        }}
        className="!w-3 !h-3 !rounded-full !-top-1.5 !border-2 !border-white transition-all duration-200"
      />

      <div
        style={{
          boxShadow: selected
            ? `${config.glow}, 0 4px 16px rgba(0, 0, 0, 0.08)`
            : "0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)",
          borderColor: selected ? config.primary : "rgb(226, 232, 240)",
        }}
        className="bg-white/95 backdrop-blur-sm rounded-xl border transition-all duration-200 overflow-hidden"
      >
        <div style={{ background: config.primary }} className="h-0.5 opacity-60" />

        <div className="p-4">
          <div className="flex items-start gap-3">
            <div
              style={{
                backgroundColor: config.surface,
                borderColor: config.border,
              }}
              className="relative w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border transition-all duration-200 group-hover:scale-105"
            >
              <Icon style={{ color: config.primary }} className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  {data.order !== undefined ? `步骤 ${data.order + 1}` : "动作"}
                </span>
                {data.isConfigured !== undefined && (
                  <div
                    style={{
                      backgroundColor: data.isConfigured ? "rgb(16, 185, 129)" : "rgb(251, 191, 36)",
                      boxShadow: data.isConfigured
                        ? "0 0 8px rgba(16, 185, 129, 0.3)"
                        : "0 0 8px rgba(251, 191, 36, 0.3)",
                    }}
                    className="w-1.5 h-1.5 rounded-full"
                  />
                )}
              </div>

              <h3 className="text-sm font-semibold text-foreground leading-tight mb-0.5">{data.label}</h3>

              {data.description && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{data.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: selected ? config.primary : "rgb(203, 213, 225)",
          boxShadow: selected ? config.glow : "none",
        }}
        className="!w-3 !h-3 !rounded-full !-bottom-1.5 !border-2 !border-white transition-all duration-200"
      />
    </div>
  )
}

export const ActionNode = memo(ActionNodeComponent)
export default ActionNode
