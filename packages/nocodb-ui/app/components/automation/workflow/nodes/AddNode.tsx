"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Plus } from "lucide-react";

export interface AddNodeData {
  onClick?: () => void;
}

interface AddNodeProps {
  data: AddNodeData;
  selected?: boolean;
}

function AddNodeComponent({ data, selected }: AddNodeProps) {
  return (
    <div
      className={`
        w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all duration-150
        ${selected 
          ? "bg-blue-500 text-white" 
          : "bg-gray-100 text-gray-400 hover:bg-blue-500 hover:text-white"
        }
      `}
      onClick={data.onClick}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-transparent !border-0 !-top-1"
      />
      <Plus className="w-4 h-4" />
    </div>
  );
}

export const AddNode = memo(AddNodeComponent);
export default AddNode;
