"use client";

import { useCallback, useMemo, useState, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  MarkerType,
  ConnectionLineType,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lock,
  Unlock,
  Download,
  Undo,
  Redo,
} from "lucide-react";
import { TriggerNode, type TriggerNodeData } from "./nodes/TriggerNode";
import { ActionNode, type ActionNodeData } from "./nodes/ActionNode";
import { ConditionNode, type ConditionNodeData } from "./nodes/ConditionNode";
import { AddNode, type AddNodeData } from "./nodes/AddNode";
import { NodeToolbar } from "./NodeToolbar";
import { BranchEdge } from "./edges/BranchEdge";
import type {
  AutomationTrigger,
  AutomationAction,
  TriggerType,
  ActionType,
} from "@/app/composables/useAutomation/types";

// Node types registration
const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  addNode: AddNode,
};

// Edge types registration
const edgeTypes: EdgeTypes = {
  branch: BranchEdge,
};

// Labels for triggers
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

// Labels for actions
const actionLabels: Record<ActionType, string> = {
  "record.update": "更新记录",
  "record.create": "创建记录",
  "record.delete": "删除记录",
  "notification.email": "发送邮件",
  "notification.webhook": "调用 Webhook",
  "notification.slack": "发送 Slack",
  "notification.feishu": "发送飞书",
  "notification.dingtalk": "发送钉钉",
  "notification.wechat": "发送企微",
  "script.run": "运行脚本",
  "flow.condition": "条件分支",
  "flow.delay": "延迟执行",
  "flow.loop": "循环执行",
};

interface WorkflowCanvasProps {
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onUpdateTrigger: (trigger: Partial<AutomationTrigger>) => void;
  onAddAction: (type: ActionType, afterNodeId?: string, branch?: "true" | "false") => void;
  onUpdateAction: (id: string, updates: Partial<AutomationAction>) => void;
  onDeleteAction: (id: string) => void;
  onReorderActions: (actions: AutomationAction[]) => void;
}

// Build nodes from automation data
function buildNodes(
  trigger: AutomationTrigger,
  actions: AutomationAction[],
  onAddClick: (afterNodeId?: string, branch?: "true" | "false") => void
): Node[] {
  const nodes: Node[] = [];
  const NODE_WIDTH = 200;
  const NODE_HEIGHT = 70;
  const VERTICAL_GAP = 60;
  const HORIZONTAL_GAP = 240;
  const CENTER_X = 300;

  // Trigger node
  nodes.push({
    id: "trigger",
    type: "trigger",
    position: { x: CENTER_X, y: 40 },
    data: {
      label: triggerLabels[trigger.type] || trigger.type,
      triggerType: trigger.type,
      isConfigured: true,
      hasConditions: (trigger.conditions?.conditions?.length || 0) > 0,
    } as TriggerNodeData,
  });

  // Build action nodes with proper positioning
  let currentY = 40 + NODE_HEIGHT + VERTICAL_GAP;
  const processedActions = new Set<string>();

  // Get main flow actions (not in branches)
  const branchChildIds = new Set<string>();
  actions.forEach((action) => {
    if (action.true_branch_id) branchChildIds.add(action.true_branch_id);
    if (action.false_branch_id) branchChildIds.add(action.false_branch_id);
  });

  const mainActions = actions
    .filter((a) => !branchChildIds.has(a.id))
    .sort((a, b) => a.order - b.order);

  // Process each main action
  mainActions.forEach((action, index) => {
    if (processedActions.has(action.id)) return;
    processedActions.add(action.id);

    const isCondition = action.type === "flow.condition";

    if (isCondition) {
      // Condition node
      nodes.push({
        id: action.id,
        type: "condition",
        position: { x: CENTER_X, y: currentY },
        data: {
          label: actionLabels[action.type] || action.type,
          condition: action.config.condition,
          isConfigured: (action.config.condition?.conditions?.length || 0) > 0,
          conditionCount: action.config.condition?.conditions?.length || 0,
        } as ConditionNodeData,
      });

      // Add branch nodes
      const trueAction = actions.find((a) => a.id === action.true_branch_id);
      const falseAction = actions.find((a) => a.id === action.false_branch_id);

      const branchY = currentY + NODE_HEIGHT + VERTICAL_GAP;

      // True branch
      if (trueAction) {
        processedActions.add(trueAction.id);
        nodes.push({
          id: trueAction.id,
          type: "action",
          position: { x: CENTER_X - HORIZONTAL_GAP / 2, y: branchY },
          data: {
            label: actionLabels[trueAction.type] || trueAction.type,
            actionType: trueAction.type,
            isConfigured: isActionConfigured(trueAction),
            order: trueAction.order,
          } as ActionNodeData,
        });
      } else {
        // Add placeholder for true branch
        nodes.push({
          id: `add-true-${action.id}`,
          type: "addNode",
          position: { x: CENTER_X - HORIZONTAL_GAP / 2 + NODE_WIDTH / 2 - 16, y: branchY },
          data: {
            onClick: () => onAddClick(action.id, "true"),
          } as AddNodeData,
        });
      }

      // False branch
      if (falseAction) {
        processedActions.add(falseAction.id);
        nodes.push({
          id: falseAction.id,
          type: "action",
          position: { x: CENTER_X + HORIZONTAL_GAP / 2, y: branchY },
          data: {
            label: actionLabels[falseAction.type] || falseAction.type,
            actionType: falseAction.type,
            isConfigured: isActionConfigured(falseAction),
            order: falseAction.order,
          } as ActionNodeData,
        });
      } else {
        // Add placeholder for false branch
        nodes.push({
          id: `add-false-${action.id}`,
          type: "addNode",
          position: { x: CENTER_X + HORIZONTAL_GAP / 2 + NODE_WIDTH / 2 - 16, y: branchY },
          data: {
            onClick: () => onAddClick(action.id, "false"),
          } as AddNodeData,
        });
      }

      currentY = branchY + NODE_HEIGHT + VERTICAL_GAP;
    } else {
      // Regular action node
      nodes.push({
        id: action.id,
        type: "action",
        position: { x: CENTER_X, y: currentY },
        data: {
          label: actionLabels[action.type] || action.type,
          actionType: action.type,
          isConfigured: isActionConfigured(action),
          order: action.order,
        } as ActionNodeData,
      });

      currentY += NODE_HEIGHT + VERTICAL_GAP;
    }
  });

  // Add node at the end
  nodes.push({
    id: "add-end",
    type: "addNode",
    position: { x: CENTER_X + NODE_WIDTH / 2 - 16, y: currentY },
    data: {
      onClick: () => onAddClick(),
    } as AddNodeData,
  });

  return nodes;
}

// Build edges from automation data
function buildEdges(trigger: AutomationTrigger, actions: AutomationAction[]): Edge[] {
  const edges: Edge[] = [];

  // Get main flow actions
  const branchChildIds = new Set<string>();
  actions.forEach((action) => {
    if (action.true_branch_id) branchChildIds.add(action.true_branch_id);
    if (action.false_branch_id) branchChildIds.add(action.false_branch_id);
  });

  const mainActions = actions
    .filter((a) => !branchChildIds.has(a.id))
    .sort((a, b) => a.order - b.order);

  // Connect trigger to first action
  if (mainActions.length > 0) {
    edges.push({
      id: "trigger-to-first",
      source: "trigger",
      target: mainActions[0].id,
      type: "smoothstep",
      animated: true,
      style: { stroke: "#94a3b8", strokeWidth: 2 },
    });
  } else {
    edges.push({
      id: "trigger-to-add",
      source: "trigger",
      target: "add-end",
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "5,5" },
    });
  }

  // Connect actions
  mainActions.forEach((action, index) => {
    const isCondition = action.type === "flow.condition";

    if (isCondition) {
      // True branch edge
      const trueTarget = action.true_branch_id || `add-true-${action.id}`;
      edges.push({
        id: `${action.id}-true`,
        source: action.id,
        sourceHandle: "true",
        target: trueTarget,
        type: "branch",
        data: { branchType: "true" },
        style: { stroke: "#22c55e", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#22c55e" },
      });

      // False branch edge
      const falseTarget = action.false_branch_id || `add-false-${action.id}`;
      edges.push({
        id: `${action.id}-false`,
        source: action.id,
        sourceHandle: "false",
        target: falseTarget,
        type: "branch",
        data: { branchType: "false" },
        style: { stroke: "#ef4444", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#ef4444" },
      });
    }

    // Connect to next action
    if (index < mainActions.length - 1 && !isCondition) {
      edges.push({
        id: `${action.id}-to-${mainActions[index + 1].id}`,
        source: action.id,
        target: mainActions[index + 1].id,
        type: "smoothstep",
        animated: true,
        style: { stroke: "#94a3b8", strokeWidth: 2 },
      });
    } else if (index === mainActions.length - 1 && !isCondition) {
      edges.push({
        id: `${action.id}-to-add`,
        source: action.id,
        target: "add-end",
        type: "smoothstep",
        style: { stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "5,5" },
      });
    }
  });

  return edges;
}

// Check if action is configured
function isActionConfigured(action: AutomationAction): boolean {
  const { type, config } = action;
  switch (type) {
    case "record.update":
    case "record.create":
      return (config.field_mappings?.length || 0) > 0;
    case "notification.email":
      return Boolean(config.recipients?.length && config.body_template);
    case "notification.webhook":
      return Boolean(config.webhook_url);
    case "flow.condition":
      return (config.condition?.conditions?.length || 0) > 0;
    case "flow.delay":
      return Boolean(config.delay_seconds);
    default:
      return true;
  }
}

export function WorkflowCanvas({
  trigger,
  actions,
  selectedNodeId,
  onSelectNode,
  onUpdateTrigger,
  onAddAction,
  onUpdateAction,
  onDeleteAction,
  onReorderActions,
}: WorkflowCanvasProps) {
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null);
  const [addContext, setAddContext] = useState<{ afterNodeId?: string; branch?: "true" | "false" } | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Handle add node click
  const handleAddClick = useCallback((afterNodeId?: string, branch?: "true" | "false") => {
    setAddContext({ afterNodeId, branch });
    setShowToolbar(true);
  }, []);

  // Build nodes and edges
  const initialNodes = useMemo(
    () => buildNodes(trigger, actions, handleAddClick),
    [trigger, actions, handleAddClick]
  );

  const initialEdges = useMemo(
    () => buildEdges(trigger, actions),
    [trigger, actions]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when data changes
  useMemo(() => {
    setNodes(buildNodes(trigger, actions, handleAddClick));
    setEdges(buildEdges(trigger, actions));
  }, [trigger, actions, setNodes, setEdges, handleAddClick]);

  // Handle node click
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === "addNode") {
        return;
      }
      onSelectNode(node.id);
    },
    [onSelectNode]
  );

  // Handle pane click
  const onPaneClick = useCallback(() => {
    onSelectNode(null);
    setShowToolbar(false);
  }, [onSelectNode]);

  // Handle action selection from toolbar
  const handleActionSelect = useCallback(
    (type: ActionType) => {
      onAddAction(type, addContext?.afterNodeId, addContext?.branch);
      setShowToolbar(false);
      setAddContext(null);
    },
    [onAddAction, addContext]
  );

  // Handle connection
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#94a3b8", strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={isLocked ? undefined : onNodesChange}
        onEdgesChange={isLocked ? undefined : onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { stroke: "#94a3b8", strokeWidth: 2 },
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        nodesDraggable={!isLocked}
        nodesConnectable={!isLocked}
        elementsSelectable={!isLocked}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#e2e8f0"
        />

        <Controls
          showInteractive={false}
          className="!bg-white !border !border-gray-200 !rounded-lg !shadow-sm"
        />

        <MiniMap
          nodeColor={(node) => {
            if (node.type === "trigger") return "#fbbf24";
            if (node.type === "condition") return "#f97316";
            if (node.type === "addNode") return "#e2e8f0";
            return "#3b82f6";
          }}
          maskColor="rgba(255, 255, 255, 0.8)"
          className="!bg-white !border !border-gray-200 !rounded-lg !shadow-sm"
        />

        {/* Custom controls panel */}
        <Panel position="top-right" className="flex gap-2">
          <button
            onClick={() => setIsLocked(!isLocked)}
            className={`
              p-2 rounded-lg border transition-colors
              ${isLocked 
                ? "bg-amber-50 border-amber-200 text-amber-600" 
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }
            `}
            title={isLocked ? "解锁画布" : "锁定画布"}
          >
            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
        </Panel>
      </ReactFlow>

      {/* Node Toolbar */}
      {showToolbar && (
        <div className="absolute inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setShowToolbar(false)}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <NodeToolbar
              onSelect={handleActionSelect}
              onClose={() => setShowToolbar(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkflowCanvas;
