"use client";

import { use, useState } from "react";
import {
  Plus,
  Filter,
  SortAsc,
  Download,
  Upload,
  MoreHorizontal,
  Grid3X3,
  List,
  Calendar,
  BarChart3,
  Map,
} from "lucide-react";
import { Button } from "@/app/components/ui";

export default function TablePage({
  params,
}: {
  params: Promise<{ baseId: string; tableId: string }>;
}) {
  const { baseId, tableId } = use(params);
  const [viewType, setViewType] = useState<"grid" | "list" | "calendar" | "chart">("grid");

  return (
    <div className="h-full flex flex-col">
      {/* Table Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-gray-900">表格 {tableId}</h1>
            <span className="text-sm text-gray-500">Base: {baseId}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Filter className="w-4 h-4 mr-1" />
              筛选
            </Button>
            <Button variant="ghost" size="sm">
              <SortAsc className="w-4 h-4 mr-1" />
              排序
            </Button>
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4 mr-1" />
              导出
            </Button>
            <Button variant="ghost" size="sm">
              <Upload className="w-4 h-4 mr-1" />
              导入
            </Button>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 mt-3">
          <ViewTab
            icon={<Grid3X3 className="w-4 h-4" />}
            label="Grid"
            active={viewType === "grid"}
            onClick={() => setViewType("grid")}
          />
          <ViewTab
            icon={<List className="w-4 h-4" />}
            label="List"
            active={viewType === "list"}
            onClick={() => setViewType("list")}
          />
          <ViewTab
            icon={<Calendar className="w-4 h-4" />}
            label="Calendar"
            active={viewType === "calendar"}
            onClick={() => setViewType("calendar")}
          />
          <ViewTab
            icon={<BarChart3 className="w-4 h-4" />}
            label="Chart"
            active={viewType === "chart"}
            onClick={() => setViewType("chart")}
          />
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto">
        {viewType === "grid" && <GridView />}
        {viewType === "list" && <ListView />}
        {viewType === "calendar" && <CalendarView />}
        {viewType === "chart" && <ChartView />}
      </div>
    </div>
  );
}

function ViewTab({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
        active
          ? "bg-blue-50 text-blue-600"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function GridView() {
  const columns = ["ID", "名称", "状态", "创建时间", "更新时间"];

  return (
    <div className="min-w-full">
      {/* Header Row */}
      <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0">
        {columns.map((col, i) => (
          <div
            key={i}
            className="flex-1 min-w-[150px] px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-200 last:border-r-0"
          >
            {col}
          </div>
        ))}
        <div className="w-10 px-2 py-3 flex items-center justify-center">
          <Plus className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Empty State */}
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <Grid3X3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="mb-4">暂无数据</p>
          <Button variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            添加行
          </Button>
        </div>
      </div>
    </div>
  );
}

function ListView() {
  return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <div className="text-center">
        <List className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>列表视图</p>
      </div>
    </div>
  );
}

function CalendarView() {
  return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <div className="text-center">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>日历视图</p>
      </div>
    </div>
  );
}

function ChartView() {
  return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <div className="text-center">
        <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>图表视图</p>
      </div>
    </div>
  );
}
