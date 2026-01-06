"use client";

import { useState, useCallback } from "react";
import type { ColumnType } from "nocodb-sdk";
import { UITypes, isSystemColumn } from "nocodb-sdk";
import {
  Edit3,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  Plus,
  Copy,
  EyeOff,
  Trash2,
  ChevronRight,
  Star,
  AlignLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ColumnHeaderMenuProps {
  column: ColumnType;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  // Actions
  onEdit?: () => void;
  onSortAsc?: () => void;
  onSortDesc?: () => void;
  onInsertBefore?: () => void;
  onInsertAfter?: () => void;
  onDuplicate?: () => void;
  onHide?: () => void;
  onDelete?: () => void;
  onSetAsDisplayValue?: () => void;
  onEditDescription?: () => void;
  // Permissions
  canEdit?: boolean;
  canDelete?: boolean;
  canDuplicate?: boolean;
  canHide?: boolean;
  canSort?: boolean;
  canInsert?: boolean;
  isPrimaryKey?: boolean;
  isDisplayValue?: boolean;
}

export function ColumnHeaderMenu({
  column,
  isOpen,
  onOpenChange,
  children,
  onEdit,
  onSortAsc,
  onSortDesc,
  onInsertBefore,
  onInsertAfter,
  onDuplicate,
  onHide,
  onDelete,
  onSetAsDisplayValue,
  onEditDescription,
  canEdit = true,
  canDelete = true,
  canDuplicate = true,
  canHide = true,
  canSort = true,
  canInsert = true,
  isPrimaryKey = false,
  isDisplayValue = false,
}: ColumnHeaderMenuProps) {
  const isSystem = isSystemColumn(column);
  const isSortSupported = column.uidt !== UITypes.Button;
  const isDeleteAllowed = !isSystem && !isPrimaryKey;
  const isDuplicateAllowed = !isSystem && canDuplicate;
  const isEditAllowed = !isPrimaryKey && !isSystem && canEdit;

  return (
    <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {/* Copy Field ID */}
        <DropdownMenuItem
          className="text-xs text-gray-500"
          onClick={() => {
            navigator.clipboard.writeText(column.id || "");
            onOpenChange(false);
          }}
        >
          <span className="truncate">ID: {column.id}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Edit Field */}
        {canEdit && (
          <DropdownMenuItem
            disabled={!isEditAllowed}
            onClick={() => {
              onEdit?.();
              onOpenChange(false);
            }}
          >
            <Edit3 className="w-4 h-4 mr-2" />
            编辑字段
          </DropdownMenuItem>
        )}

        {/* Sort Options */}
        {canSort && isSortSupported && (
          <>
            <DropdownMenuItem
              onClick={() => {
                onSortAsc?.();
                onOpenChange(false);
              }}
            >
              <ArrowUpNarrowWide className="w-4 h-4 mr-2" />
              升序排序
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onSortDesc?.();
                onOpenChange(false);
              }}
            >
              <ArrowDownWideNarrow className="w-4 h-4 mr-2" />
              降序排序
            </DropdownMenuItem>
          </>
        )}

        {/* Insert Field */}
        {canInsert && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Plus className="w-4 h-4 mr-2" />
              插入字段
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => {
                  onInsertBefore?.();
                  onOpenChange(false);
                }}
              >
                在前面插入
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  onInsertAfter?.();
                  onOpenChange(false);
                }}
              >
                在后面插入
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {/* Duplicate Field */}
        {canDuplicate && (
          <DropdownMenuItem
            disabled={!isDuplicateAllowed}
            onClick={() => {
              onDuplicate?.();
              onOpenChange(false);
            }}
          >
            <Copy className="w-4 h-4 mr-2" />
            复制字段
          </DropdownMenuItem>
        )}

        {/* Hide Field */}
        {canHide && !isPrimaryKey && (
          <DropdownMenuItem
            onClick={() => {
              onHide?.();
              onOpenChange(false);
            }}
          >
            <EyeOff className="w-4 h-4 mr-2" />
            隐藏字段
          </DropdownMenuItem>
        )}

        {/* Set as Display Value */}
        {!isDisplayValue && !isSystem && canEdit && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                onSetAsDisplayValue?.();
                onOpenChange(false);
              }}
            >
              <Star className="w-4 h-4 mr-2" />
              设为显示值
            </DropdownMenuItem>
          </>
        )}

        {/* Edit Description */}
        {canEdit && (
          <DropdownMenuItem
            onClick={() => {
              onEditDescription?.();
              onOpenChange(false);
            }}
          >
            <AlignLeft className="w-4 h-4 mr-2" />
            编辑描述
          </DropdownMenuItem>
        )}

        {/* Delete Field */}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!isDeleteAllowed}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={() => {
                onDelete?.();
                onOpenChange(false);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              删除字段
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ColumnHeaderMenu;
