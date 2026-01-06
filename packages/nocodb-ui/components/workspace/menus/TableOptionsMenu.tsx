"use client"

import { useState } from "react"
import { 
  Copy, 
  Edit, 
  Trash2, 
  FileText,
  MoreHorizontal,
  Lock,
  Eye,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { TableType } from "nocodb-sdk"

interface TableOptionsMenuProps {
  table: TableType
  children?: React.ReactNode
  onRename?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
  onEditDescription?: () => void
  onCopyId?: () => void
  onDuplicateDefaultView?: () => void
  onEditPermissions?: () => void
}

export function TableOptionsMenu({
  table,
  children,
  onRename,
  onDuplicate,
  onDelete,
  onEditDescription,
  onCopyId,
  onDuplicateDefaultView,
  onEditPermissions,
}: TableOptionsMenuProps) {
  const [open, setOpen] = useState(false)

  const handleCopyId = () => {
    if (table.id) {
      navigator.clipboard.writeText(table.id)
      onCopyId?.()
    }
    setOpen(false)
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
        {/* Copy Table ID */}
        <DropdownMenuItem onClick={handleCopyId} className="text-xs text-gray-500">
          <Copy className="w-4 h-4 mr-2" />
          <span className="truncate">Table ID: {table.id?.slice(0, 8)}...</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Rename */}
        <DropdownMenuItem onClick={() => { onRename?.(); setOpen(false); }}>
          <Edit className="w-4 h-4 mr-2" />
          重命名表格
        </DropdownMenuItem>

        {/* Duplicate */}
        <DropdownMenuItem onClick={() => { onDuplicate?.(); setOpen(false); }}>
          <Copy className="w-4 h-4 mr-2" />
          复制表格
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Edit Description */}
        <DropdownMenuItem onClick={() => { onEditDescription?.(); setOpen(false); }}>
          <FileText className="w-4 h-4 mr-2" />
          编辑描述
        </DropdownMenuItem>

        {/* Edit Permissions */}
        <DropdownMenuItem onClick={() => { onEditPermissions?.(); setOpen(false); }}>
          <Lock className="w-4 h-4 mr-2" />
          编辑权限
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Duplicate Default View */}
        <DropdownMenuItem onClick={() => { onDuplicateDefaultView?.(); setOpen(false); }}>
          <Eye className="w-4 h-4 mr-2" />
          复制默认视图
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Delete */}
        <DropdownMenuItem 
          onClick={() => { onDelete?.(); setOpen(false); }}
          className="text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          删除表格
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
