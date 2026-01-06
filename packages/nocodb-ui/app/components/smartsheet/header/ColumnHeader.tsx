"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ColumnType } from "nocodb-sdk";
import { UITypes } from "nocodb-sdk";
import {
  ChevronDown,
  GripVertical,
  Edit,
  Copy,
  Trash2,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Plus,
  Type,
  Hash,
  Calendar,
  CheckSquare,
  Link,
  Mail,
  Phone,
  Image,
  Star,
  List,
  User,
  Clock,
  Percent,
  DollarSign,
  AlignLeft,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

// Get icon for column type
export const getColumnIcon = (uidt: UITypes | string | undefined) => {
  switch (uidt) {
    case UITypes.SingleLineText:
      return Type;
    case UITypes.LongText:
      return AlignLeft;
    case UITypes.Number:
    case UITypes.Decimal:
    case UITypes.AutoNumber:
      return Hash;
    case UITypes.Checkbox:
      return CheckSquare;
    case UITypes.Date:
    case UITypes.DateTime:
      return Calendar;
    case UITypes.Time:
    case UITypes.CreatedTime:
    case UITypes.LastModifiedTime:
      return Clock;
    case UITypes.Email:
      return Mail;
    case UITypes.URL:
      return Link;
    case UITypes.PhoneNumber:
      return Phone;
    case UITypes.Currency:
      return DollarSign;
    case UITypes.Percent:
      return Percent;
    case UITypes.SingleSelect:
    case UITypes.MultiSelect:
      return List;
    case UITypes.Attachment:
      return Image;
    case UITypes.Rating:
      return Star;
    case UITypes.User:
    case UITypes.CreatedBy:
    case UITypes.LastModifiedBy:
      return User;
    case UITypes.LinkToAnotherRecord:
    case UITypes.Links:
      return Link;
    default:
      return Type;
  }
};

// Get column type label
export const getColumnTypeLabel = (uidt: UITypes | string | undefined): string => {
  switch (uidt) {
    case UITypes.SingleLineText:
      return "单行文本";
    case UITypes.LongText:
      return "多行文本";
    case UITypes.Number:
      return "数字";
    case UITypes.Decimal:
      return "小数";
    case UITypes.Checkbox:
      return "复选框";
    case UITypes.Date:
      return "日期";
    case UITypes.DateTime:
      return "日期时间";
    case UITypes.Time:
      return "时间";
    case UITypes.Email:
      return "邮箱";
    case UITypes.URL:
      return "链接";
    case UITypes.PhoneNumber:
      return "电话";
    case UITypes.Currency:
      return "货币";
    case UITypes.Percent:
      return "百分比";
    case UITypes.SingleSelect:
      return "单选";
    case UITypes.MultiSelect:
      return "多选";
    case UITypes.Attachment:
      return "附件";
    case UITypes.Rating:
      return "评分";
    case UITypes.Formula:
      return "公式";
    case UITypes.Rollup:
      return "汇总";
    case UITypes.Lookup:
      return "查找";
    case UITypes.LinkToAnotherRecord:
    case UITypes.Links:
      return "关联";
    case UITypes.User:
      return "用户";
    case UITypes.CreatedTime:
      return "创建时间";
    case UITypes.LastModifiedTime:
      return "修改时间";
    case UITypes.CreatedBy:
      return "创建人";
    case UITypes.LastModifiedBy:
      return "修改人";
    case UITypes.AutoNumber:
      return "自增";
    case UITypes.Duration:
      return "时长";
    case UITypes.GeoData:
      return "地理位置";
    case UITypes.JSON:
      return "JSON";
    default:
      return "文本";
  }
};

interface ColumnHeaderProps {
  column: ColumnType;
  width: number;
  isResizing?: boolean;
  onResizeStart?: (e: React.MouseEvent) => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onHide?: () => void;
  onSortAsc?: () => void;
  onSortDesc?: () => void;
  onInsertLeft?: () => void;
  onInsertRight?: () => void;
  readOnly?: boolean;
}

export function ColumnHeader({
  column,
  width,
  isResizing = false,
  onResizeStart,
  onEdit,
  onDuplicate,
  onDelete,
  onHide,
  onSortAsc,
  onSortDesc,
  onInsertLeft,
  onInsertRight,
  readOnly = false,
}: ColumnHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const Icon = getColumnIcon(column.uidt as UITypes);
  const isSystemColumn = column.system || column.pk;
  const isPrimaryKey = column.pk;
  const isPrimaryValue = column.pv;

  return (
    <div
      className={`relative flex items-center h-full group select-none transition-colors ${
        isResizing ? "bg-blue-50" : "hover:bg-white/80"
      }`}
      style={{ width, minWidth: width }}
    >
      {/* Drag Handle */}
      {!readOnly && !isSystemColumn && (
        <div className="absolute left-0 top-0 bottom-0 w-4 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-grab transition-opacity">
          <GripVertical className="w-3 h-3 text-gray-400" />
        </div>
      )}

      {/* Column Content */}
      <div className="flex-1 flex items-center gap-2 px-3 min-w-0 h-full">
        <Icon className="w-4 h-4 text-gray-500 shrink-0" />
        <span className="text-sm font-semibold text-gray-700 truncate flex-1">
          {column.title}
        </span>
        {/* {isPrimaryKey && (
          <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded shrink-0">
            PK
          </span>
        )}
        {isPrimaryValue && (
          <span className="text-[10px] text-blue-500 bg-blue-50 px-1 rounded shrink-0">
            显示值
          </span>
        )} */}
      </div>

      {/* Menu Trigger */}
      {!readOnly && (
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={`p-1.5 mr-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-gray-200/80 transition-all ${
                isMenuOpen ? "opacity-100 bg-gray-200" : ""
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {/* Edit Column */}
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(false);
                onEdit?.();
              }}
              disabled={isSystemColumn}
            >
              <Edit className="w-4 h-4 mr-2" />
              编辑字段
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Sort */}
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(false);
                onSortAsc?.();
              }}
            >
              <ArrowUp className="w-4 h-4 mr-2" />
              升序排序
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(false);
                onSortDesc?.();
              }}
            >
              <ArrowDown className="w-4 h-4 mr-2" />
              降序排序
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Insert Column */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Plus className="w-4 h-4 mr-2" />
                插入字段
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onInsertLeft?.();
                  }}
                >
                  在左侧插入
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onInsertRight?.();
                  }}
                >
                  在右侧插入
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Duplicate */}
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(false);
                onDuplicate?.();
              }}
              disabled={isSystemColumn}
            >
              <Copy className="w-4 h-4 mr-2" />
              复制字段
            </DropdownMenuItem>

            {/* Hide */}
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(false);
                onHide?.();
              }}
            >
              <EyeOff className="w-4 h-4 mr-2" />
              隐藏字段
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Delete */}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(false);
                onDelete?.();
              }}
              disabled={isSystemColumn || isPrimaryValue}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              删除字段
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Resize Handle */}
      {onResizeStart && (
        <div
          className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 ${
            isResizing ? "bg-blue-500" : "opacity-0 group-hover:opacity-100"
          }`}
          onMouseDown={onResizeStart}
        />
      )}
    </div>
  );
}
