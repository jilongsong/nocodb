"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Settings,
  Table2,
  Database,
  Loader2,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import Image from "next/image";
import { useBases } from "@/app/composables/useBases";
import { useTables } from "@/app/composables/useTables";
import { BaseOptionsMenu } from "@/components/workspace/menus/BaseOptionsMenu";
import { TableOptionsMenu } from "@/components/workspace/menus/TableOptionsMenu";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const params = useParams();
  const { basesList, isProjectsLoading, loadProjects, navigateToProject, updateProject, deleteProject } = useBases();
  const { baseTables, loadProjectTables, isTablesLoading, updateTable, deleteTable } = useTables();
  
  const [expandedBases, setExpandedBases] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // 当前选中的 base 和 table
  const activeBaseId = params?.baseId as string | undefined;
  const activeTableId = params?.tableId as string | undefined;

  // 加载 bases
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // 当 base 展开时加载其 tables
  useEffect(() => {
    expandedBases.forEach((baseId) => {
      loadProjectTables(baseId);
    });
  }, [expandedBases, loadProjectTables]);

  // 自动展开当前选中的 base
  useEffect(() => {
    if (activeBaseId && !expandedBases.includes(activeBaseId)) {
      setExpandedBases((prev) => [...prev, activeBaseId]);
    }
  }, [activeBaseId]);

  const toggleBase = (baseId: string) => {
    setExpandedBases((prev) =>
      prev.includes(baseId) ? prev.filter((id) => id !== baseId) : [...prev, baseId]
    );
  };

  // 过滤 bases
  const filteredBases = basesList.filter((base) =>
    base.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 折叠状态
  if (collapsed) {
    return (
      <div className="w-12 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-4">
        <button onClick={onToggle} className="p-2 hover:bg-gray-100 rounded-lg mb-4">
          <PanelLeft className="w-5 h-5 text-gray-600" />
        </button>
        {filteredBases.slice(0, 5).map((base) => (
          <button
            key={base.id}
            onClick={() => base.id && navigateToProject({ baseId: base.id })}
            className={`w-8 h-8 flex items-center justify-center rounded-lg mb-2 ${
              activeBaseId === base.id ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
            }`}
            title={base.title || ""}
          >
            <Database className="w-4 h-4" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Si-Me™ Table" width={24} height={24} />
            <span className="font-semibold text-gray-900">Si-Me™ Table</span>
          </div>
          <button onClick={onToggle} className="p-1 hover:bg-gray-100 rounded">
            <PanelLeftClose className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
        </div>
      </div>

      {/* Bases List */}
      <nav className="flex-1 overflow-y-auto px-2">
        {isProjectsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : filteredBases.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            {searchQuery ? "没有匹配的数据库" : "暂无数据库"}
          </div>
        ) : (
          filteredBases.map((base) => {
            const isExpanded = expandedBases.includes(base.id!);
            const isActive = activeBaseId === base.id;
            const tables = baseTables.get(base.id!) || [];

            return (
              <div key={base.id} className="mb-1">
                {/* Base Item */}
                <div
                  className={`flex items-center gap-1 p-2 rounded-lg cursor-pointer group ${
                    isActive ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <button
                    onClick={() => toggleBase(base.id!)}
                    className="p-0.5 hover:bg-gray-200 rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => base.id && navigateToProject({ baseId: base.id })}
                    className="flex-1 flex items-center gap-2 text-left"
                  >
                    <Database className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium truncate">{base.title}</span>
                  </button>
                  <BaseOptionsMenu
                    base={base}
                    onRename={() => {
                      const newTitle = prompt("输入新名称", base.title || "");
                      if (newTitle && newTitle !== base.title && base.id) {
                        updateProject(base.id, { title: newTitle });
                      }
                    }}
                    onDuplicate={() => {
                      // TODO: Implement base duplication API
                      alert("复制数据库功能开发中...");
                    }}
                    onDelete={() => {
                      if (base.id && confirm(`确定要删除数据库 "${base.title}" 吗？此操作不可恢复！`)) {
                        deleteProject(base.id);
                      }
                    }}
                    onOpenSettings={() => navigateToProject({ baseId: base.id! })}
                    onCopyId={() => {
                      navigator.clipboard.writeText(base.id || "");
                    }}
                  >
                    <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded">
                      <MoreHorizontal className="w-4 h-4 text-gray-400" />
                    </button>
                  </BaseOptionsMenu>
                </div>

                {/* Tables List */}
                {isExpanded && (
                  <div className="ml-6 mt-1">
                    {isTablesLoading && tables.length === 0 ? (
                      <div className="flex items-center gap-2 p-2 text-gray-400 text-sm">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>加载中...</span>
                      </div>
                    ) : tables.length === 0 ? (
                      <div className="p-2 text-gray-400 text-sm">暂无表格</div>
                    ) : (
                      tables.map((table) => {
                        const isTableActive = activeTableId === table.id;
                        return (
                          <div
                            key={table.id}
                            className={`flex items-center gap-2 p-2 rounded text-sm group ${
                              isTableActive
                                ? "bg-blue-50 text-blue-600"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <Link
                              href={`/workspace/${base.id}/table/${table.id}`}
                              className="flex-1 flex items-center gap-2"
                            >
                              <Table2 className="w-4 h-4 shrink-0" />
                              <span className="truncate">{table.title}</span>
                            </Link>
                            <TableOptionsMenu
                              table={table}
                              onRename={() => {
                                const newTitle = prompt("输入新名称", table.title || "");
                                if (newTitle && newTitle !== table.title && table.id) {
                                  updateTable({ ...table, title: newTitle });
                                }
                              }}
                              onDuplicate={() => {
                                alert("复制表格功能开发中...");
                              }}
                              onDelete={() => {
                                if (table.id && base.id && confirm(`确定要删除表格 "${table.title}" 吗？此操作不可恢复！`)) {
                                  deleteTable(base.id, table.id);
                                }
                              }}
                              onEditDescription={() => {
                                alert("编辑描述功能开发中...");
                              }}
                              onCopyId={() => {
                                navigator.clipboard.writeText(table.id || "");
                              }}
                            >
                              <button 
                                className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                            </TableOptionsMenu>
                          </div>
                        );
                      })
                    )}
                    {/* Add Table Button */}
                    <Link
                      href={`/workspace/${base.id}?action=create-table`}
                      className="flex items-center gap-2 p-2 rounded text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    >
                      <Plus className="w-4 h-4" />
                      <span>新建表格</span>
                    </Link>
                  </div>
                )}
              </div>
            );
          })
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200">
        <Link
          href="/workspace?action=create-base"
          className="w-full flex items-center gap-2 p-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
        >
          <Plus className="w-4 h-4" />
          <span>新建数据库</span>
        </Link>
      </div>
    </div>
  );
}
