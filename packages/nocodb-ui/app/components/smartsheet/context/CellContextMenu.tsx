"use client";

import { useCallback } from "react";
import type { ColumnType } from "nocodb-sdk";
import {
  Copy,
  ClipboardPaste,
  Trash2,
  Expand,
  Plus,
  MessageSquare,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface CellContextMenuProps {
  children: React.ReactNode;
  rowIndex: number;
  colIndex: number;
  column?: ColumnType;
  // Actions
  onCopy?: () => void;
  onPaste?: () => void;
  onClearCell?: () => void;
  onExpandRow?: () => void;
  onInsertRowAbove?: () => void;
  onInsertRowBelow?: () => void;
  onDeleteRow?: () => void;
  onComment?: () => void;
  // Permissions
  canEdit?: boolean;
  canDelete?: boolean;
  canInsert?: boolean;
  canExpand?: boolean;
  hasSelection?: boolean;
}

export function CellContextMenu({
  children,
  rowIndex,
  colIndex,
  column,
  onCopy,
  onPaste,
  onClearCell,
  onExpandRow,
  onInsertRowAbove,
  onInsertRowBelow,
  onDeleteRow,
  onComment,
  canEdit = true,
  canDelete = true,
  canInsert = true,
  canExpand = true,
  hasSelection = false,
}: CellContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {/* Copy */}
        <ContextMenuItem onClick={onCopy}>
          <Copy className="w-4 h-4 mr-2" />
          复制
        </ContextMenuItem>

        {/* Paste */}
        {canEdit && (
          <ContextMenuItem onClick={onPaste}>
            <ClipboardPaste className="w-4 h-4 mr-2" />
            粘贴
          </ContextMenuItem>
        )}

        {/* Clear Cell */}
        {canEdit && (
          <ContextMenuItem onClick={onClearCell}>
            <Trash2 className="w-4 h-4 mr-2" />
            清空单元格
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        {/* Expand Row */}
        {canExpand && (
          <ContextMenuItem onClick={onExpandRow}>
            <Expand className="w-4 h-4 mr-2" />
            展开记录
          </ContextMenuItem>
        )}

        {/* Comment */}
        <ContextMenuItem onClick={onComment}>
          <MessageSquare className="w-4 h-4 mr-2" />
          评论
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Insert Row Above */}
        {canInsert && (
          <ContextMenuItem onClick={onInsertRowAbove}>
            <Plus className="w-4 h-4 mr-2" />
            在上方插入行
          </ContextMenuItem>
        )}

        {/* Insert Row Below */}
        {canInsert && (
          <ContextMenuItem onClick={onInsertRowBelow}>
            <Plus className="w-4 h-4 mr-2" />
            在下方插入行
          </ContextMenuItem>
        )}

        {/* Delete Row */}
        {canDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={onDeleteRow}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {hasSelection ? "删除选中行" : "删除行"}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default CellContextMenu;
