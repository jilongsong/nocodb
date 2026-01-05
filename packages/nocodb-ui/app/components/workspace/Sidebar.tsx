"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Settings,
  Table2,
  Database,
  Users,
  Zap,
  ExternalLink,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { NocoIcon } from "@/app/components/icons";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface WorkspaceItem {
  id: string;
  name: string;
  icon: string;
  tables: { id: string; name: string }[];
}

const mockWorkspaces: WorkspaceItem[] = [
  {
    id: "1",
    name: "Getting Started",
    icon: "🚀",
    tables: [
      { id: "t1", name: "用户表" },
      { id: "t2", name: "订单表" },
    ],
  },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<string[]>(["1"]);
  const [expandedSections, setExpandedSections] = useState<string[]>(["tables"]);
  const [selectedWorkspace, setSelectedWorkspace] = useState("1");

  const toggleWorkspace = (id: string) => {
    setExpandedWorkspaces((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
    );
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  };

  if (collapsed) {
    return (
      <div className="w-12 bg-white border-r border-gray-200 flex flex-col items-center py-4">
        <button onClick={onToggle} className="p-2 hover:bg-gray-100 rounded-lg mb-4">
          <PanelLeft className="w-5 h-5 text-gray-600" />
        </button>
        <NocoIcon className="mb-4" />
        {mockWorkspaces.map((ws) => (
          <button
            key={ws.id}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 mb-2"
            title={ws.name}
          >
            <span className="text-lg">{ws.icon}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <NocoIcon />
            <span className="font-semibold text-gray-900">NocoDB</span>
          </div>
          <button onClick={onToggle} className="p-1 hover:bg-gray-100 rounded">
            <PanelLeftClose className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Workspace Selector */}
        <button className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 text-left">
          <div className="flex items-center gap-2">
            <span className="text-lg">🚀</span>
            <span className="font-medium text-sm">Getting Started</span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Quick search..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            Ctrl K
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3">
        {/* Bases */}
        {mockWorkspaces.map((workspace) => (
          <div key={workspace.id} className="mb-2">
            <button
              onClick={() => {
                toggleWorkspace(workspace.id);
                setSelectedWorkspace(workspace.id);
              }}
              className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm ${
                selectedWorkspace === workspace.id
                  ? "bg-blue-50 text-blue-600"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <Database className="w-4 h-4" />
              <span className="flex-1 font-medium">{workspace.name}</span>
              {expandedWorkspaces.includes(workspace.id) ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {expandedWorkspaces.includes(workspace.id) && (
              <div className="ml-4 mt-1">
                {/* Tables Section */}
                <div className="mb-2">
                  <button
                    onClick={() => toggleSection("tables")}
                    className="w-full flex items-center gap-2 p-1.5 rounded text-left text-xs text-gray-500 hover:bg-gray-100"
                  >
                    {expandedSections.includes("tables") ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    <span>Tableaux</span>
                  </button>

                  {expandedSections.includes("tables") && (
                    <div className="ml-4">
                      {workspace.tables.map((table) => (
                        <Link
                          key={table.id}
                          href={`/workspace/${workspace.id}/table/${table.id}`}
                          className="flex items-center gap-2 p-1.5 rounded text-sm text-gray-600 hover:bg-gray-100"
                        >
                          <Table2 className="w-4 h-4" />
                          <span>{table.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Quick Actions */}
        <div className="mt-4 space-y-1">
          <Link
            href="/workspace/members"
            className="flex items-center gap-2 p-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
          >
            <Users className="w-4 h-4" />
            <span>成员管理</span>
          </Link>
          <Link
            href="/workspace/integrations"
            className="flex items-center gap-2 p-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
          >
            <Zap className="w-4 h-4" />
            <span>集成</span>
          </Link>
          <Link
            href="/workspace/settings"
            className="flex items-center gap-2 p-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
          >
            <Settings className="w-4 h-4" />
            <span>设置</span>
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200">
        <button className="w-full flex items-center gap-2 p-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">
          <Plus className="w-4 h-4" />
          <span>新建工作空间</span>
        </button>
        <a
          href="https://nocodb.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 mt-1"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Try NocoDB Cloud</span>
        </a>
      </div>
    </div>
  );
}
