"use client"

import { useState } from "react"
import { 
  Copy, 
  Edit, 
  Trash2, 
  Settings, 
  Download, 
  FileSpreadsheet,
  FileJson,
  FileText,
  Database,
  Code,
  Share2,
  MoreHorizontal,
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
} from "@/components/ui/dropdown-menu"
import type { BaseType } from "nocodb-sdk"

interface BaseOptionsMenuProps {
  base: BaseType
  children?: React.ReactNode
  onRename?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
  onOpenSettings?: () => void
  onCopyId?: () => void
  onOpenERD?: () => void
  onImportCSV?: () => void
  onImportExcel?: () => void
  onImportJSON?: () => void
}

export function BaseOptionsMenu({
  base,
  children,
  onRename,
  onDuplicate,
  onDelete,
  onOpenSettings,
  onCopyId,
  onOpenERD,
  onImportCSV,
  onImportExcel,
  onImportJSON,
}: BaseOptionsMenuProps) {
  const [open, setOpen] = useState(false)

  const handleCopyId = () => {
    if (base.id) {
      navigator.clipboard.writeText(base.id)
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
        {/* Copy Base ID */}
        <DropdownMenuItem onClick={handleCopyId} className="text-xs text-gray-500">
          <Copy className="w-4 h-4 mr-2" />
          <span className="truncate">Base ID: {base.id?.slice(0, 8)}...</span>
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
          复制
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* ERD View */}
        <DropdownMenuItem onClick={() => { onOpenERD?.(); setOpen(false); }}>
          <Share2 className="w-4 h-4 mr-2" />
          关系图 (ERD)
        </DropdownMenuItem>

        {/* REST APIs */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Code className="w-4 h-4 mr-2" />
            REST APIs
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem 
              onClick={() => window.open(`/api/v2/meta/bases/${base.id}/swagger`, '_blank')}
            >
              API v2
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => window.open(`/api/v3/meta/bases/${base.id}/swagger`, '_blank')}
            >
              API v3
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {/* Import Data */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Download className="w-4 h-4 mr-2" />
            导入数据
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => { onImportCSV?.(); setOpen(false); }}>
              <FileText className="w-4 h-4 mr-2" />
              CSV 文件
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onImportExcel?.(); setOpen(false); }}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel 文件
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onImportJSON?.(); setOpen(false); }}>
              <FileJson className="w-4 h-4 mr-2" />
              JSON 文件
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {/* Settings */}
        <DropdownMenuItem onClick={() => { onOpenSettings?.(); setOpen(false); }}>
          <Settings className="w-4 h-4 mr-2" />
          设置
        </DropdownMenuItem>

        {/* Delete */}
        <DropdownMenuItem 
          onClick={() => { onDelete?.(); setOpen(false); }}
          className="text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
