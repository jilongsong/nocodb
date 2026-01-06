"use client"

import { useState } from "react"
import { 
  Copy, 
  Edit, 
  Trash2, 
  FileText,
  MoreHorizontal,
  Lock,
  Unlock,
  User,
  Users,
  Download,
  Eye,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import type { ViewType } from "nocodb-sdk"

type LockType = "collaborative" | "personal" | "locked"

interface ViewOptionsMenuProps {
  view: ViewType
  children?: React.ReactNode
  onRename?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
  onEditDescription?: () => void
  onCopyId?: () => void
  onChangeLockType?: (type: LockType) => void
  onImportCSV?: () => void
  onImportExcel?: () => void
  currentLockType?: LockType
  isDefault?: boolean
}

export function ViewOptionsMenu({
  view,
  children,
  onRename,
  onDuplicate,
  onDelete,
  onEditDescription,
  onCopyId,
  onChangeLockType,
  onImportCSV,
  onImportExcel,
  currentLockType = "collaborative",
  isDefault = false,
}: ViewOptionsMenuProps) {
  const [open, setOpen] = useState(false)

  const handleCopyId = () => {
    if (view.id) {
      navigator.clipboard.writeText(view.id)
      onCopyId?.()
    }
    setOpen(false)
  }

  const lockTypeLabels: Record<LockType, { icon: React.ReactNode; label: string }> = {
    collaborative: { icon: <Users className="w-4 h-4" />, label: "协作模式" },
    personal: { icon: <User className="w-4 h-4" />, label: "个人模式" },
    locked: { icon: <Lock className="w-4 h-4" />, label: "锁定模式" },
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {children || (
          <button className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {/* Copy View ID */}
        <DropdownMenuItem onClick={handleCopyId} className="text-xs text-gray-500">
          <Copy className="w-4 h-4 mr-2" />
          <span className="truncate">View ID: {view.id?.slice(0, 8)}...</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Rename */}
        <DropdownMenuItem onClick={() => { onRename?.(); setOpen(false); }}>
          <Edit className="w-4 h-4 mr-2" />
          重命名
        </DropdownMenuItem>

        {/* Duplicate */}
        <DropdownMenuItem onClick={() => { onDuplicate?.(); setOpen(false); }}>
          <Copy className="w-4 h-4 mr-2" />
          复制视图
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Edit Description */}
        <DropdownMenuItem onClick={() => { onEditDescription?.(); setOpen(false); }}>
          <FileText className="w-4 h-4 mr-2" />
          编辑描述
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Lock Type */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {lockTypeLabels[currentLockType].icon}
            <span className="ml-2">视图模式</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuLabel>选择视图模式</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup 
              value={currentLockType} 
              onValueChange={(value: string) => { 
                onChangeLockType?.(value as LockType); 
                setOpen(false); 
              }}
            >
              <DropdownMenuRadioItem value="collaborative" disabled={isDefault}>
                <Users className="w-4 h-4 mr-2" />
                协作模式
                <span className="ml-2 text-xs text-gray-400">所有人可编辑</span>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="personal" disabled={isDefault}>
                <User className="w-4 h-4 mr-2" />
                个人模式
                <span className="ml-2 text-xs text-gray-400">仅自己可见</span>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="locked">
                <Lock className="w-4 h-4 mr-2" />
                锁定模式
                <span className="ml-2 text-xs text-gray-400">禁止编辑</span>
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {/* Import */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Download className="w-4 h-4 mr-2" />
            导入数据
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => { onImportCSV?.(); setOpen(false); }}>
              CSV 文件
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onImportExcel?.(); setOpen(false); }}>
              Excel 文件
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Delete - not available for default view */}
        {!isDefault && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => { onDelete?.(); setOpen(false); }}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              删除视图
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
