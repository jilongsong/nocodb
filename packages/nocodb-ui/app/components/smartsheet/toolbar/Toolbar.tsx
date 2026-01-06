"use client";

import { useState, useCallback } from "react";
import type { ColumnType, SortType } from "nocodb-sdk";
import {
  Filter,
  SortAsc,
  SortDesc,
  Search,
  EyeOff,
  Columns,
  Download,
  Upload,
  Plus,
  X,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { Button } from "@/app/components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { FilterCondition, FilterComparisonOp } from "@/app/composables/useViewFilters";

const FILTER_OPERATORS: { value: FilterComparisonOp; label: string }[] = [
  { value: "eq", label: "等于" },
  { value: "neq", label: "不等于" },
  { value: "like", label: "包含" },
  { value: "nlike", label: "不包含" },
  { value: "gt", label: "大于" },
  { value: "gte", label: "大于等于" },
  { value: "lt", label: "小于" },
  { value: "lte", label: "小于等于" },
  { value: "null", label: "为空" },
  { value: "notnull", label: "不为空" },
  { value: "empty", label: "空字符串" },
  { value: "notempty", label: "非空字符串" },
];

interface ToolbarProps {
  columns: ColumnType[];
  filters: FilterCondition[];
  sorts: SortType[];
  searchQuery: string;
  // Filter actions
  onAddFilter: (columnId: string, comparisonOp?: FilterComparisonOp, value?: any) => void;
  onUpdateFilter: (filterId: string, updates: Partial<FilterCondition>) => void;
  onDeleteFilter: (filterId: string) => void;
  // Sort actions
  onAddSort: (columnId: string, direction?: "asc" | "desc") => void;
  onUpdateSort: (sortId: string, updates: Partial<SortType>) => void;
  onDeleteSort: (sortId: string) => void;
  // Other
  onSearchChange: (query: string) => void;
  onExport?: () => void;
  onImport?: () => void;
  onAddColumn?: () => void;
  readOnly?: boolean;
}

export function Toolbar({
  columns,
  filters,
  sorts,
  searchQuery,
  onAddFilter,
  onUpdateFilter,
  onDeleteFilter,
  onAddSort,
  onUpdateSort,
  onDeleteSort,
  onSearchChange,
  onExport,
  onImport,
  onAddColumn,
  readOnly = false,
}: ToolbarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Filter columns (exclude system columns)
  const filterableColumns = columns.filter(
    (col) => !col.system && !col.title?.startsWith("nc_")
  );

  // Handle add filter
  const handleAddFilter = useCallback(() => {
    if (filterableColumns.length === 0) return;
    onAddFilter(filterableColumns[0].id!, "eq", "");
  }, [filterableColumns, onAddFilter]);

  // Handle add sort
  const handleAddSort = useCallback(() => {
    if (filterableColumns.length === 0) return;
    onAddSort(filterableColumns[0].id!, "asc");
  }, [filterableColumns, onAddSort]);

  // Get column title by id
  const getColumnById = useCallback(
    (columnId: string) => columns.find((c) => c.id === columnId),
    [columns]
  );

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
      {/* Search */}
      <div className="relative">
        {isSearchExpanded ? (
          <div className="flex items-center gap-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="搜索..."
                className="w-48 pl-8 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            <button
              onClick={() => {
                setIsSearchExpanded(false);
                onSearchChange("");
              }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSearchExpanded(true)}
          >
            <Search className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Filter */}
      <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={filters.length > 0 ? "text-blue-600" : ""}
          >
            <Filter className="w-4 h-4 mr-1" />
            筛选
            {filters.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded">
                {filters.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-96 p-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">筛选条件</h4>
              <Button variant="ghost" size="sm" onClick={handleAddFilter}>
                <Plus className="w-4 h-4 mr-1" />
                添加
              </Button>
            </div>

            {filters.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                暂无筛选条件
              </p>
            ) : (
              <div className="space-y-2">
                {filters.map((filter) => (
                  <div
                    key={filter.id}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                  >
                    {/* Column Select */}
                    <select
                      value={filter.fk_column_id || ""}
                      onChange={(e) =>
                        onUpdateFilter(filter.id!, { fk_column_id: e.target.value })
                      }
                      className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      {filterableColumns.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.title}
                        </option>
                      ))}
                    </select>

                    {/* Operator Select */}
                    <select
                      value={filter.comparison_op || "eq"}
                      onChange={(e) =>
                        onUpdateFilter(filter.id!, {
                          comparison_op: e.target.value as FilterComparisonOp,
                        })
                      }
                      className="w-24 text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      {FILTER_OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>

                    {/* Value Input */}
                    {!["null", "notnull", "empty", "notempty"].includes(
                      filter.comparison_op || ""
                    ) && (
                      <input
                        type="text"
                        value={filter.value || ""}
                        onChange={(e) =>
                          onUpdateFilter(filter.id!, { value: e.target.value })
                        }
                        placeholder="值"
                        className="w-24 text-sm border border-gray-300 rounded px-2 py-1"
                      />
                    )}

                    {/* Remove */}
                    <button
                      onClick={() => onDeleteFilter(filter.id!)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {filters.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => filters.forEach(f => f.id && onDeleteFilter(f.id))}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                清除全部
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Sort */}
      <Popover open={isSortOpen} onOpenChange={setIsSortOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={sorts.length > 0 ? "text-blue-600" : ""}
          >
            <SortAsc className="w-4 h-4 mr-1" />
            排序
            {sorts.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded">
                {sorts.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">排序条件</h4>
              <Button variant="ghost" size="sm" onClick={handleAddSort}>
                <Plus className="w-4 h-4 mr-1" />
                添加
              </Button>
            </div>

            {sorts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                暂无排序条件
              </p>
            ) : (
              <div className="space-y-2">
                {sorts.map((sort) => (
                  <div
                    key={sort.id}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                  >
                    {/* Column Select */}
                    <select
                      value={sort.fk_column_id || ""}
                      onChange={(e) =>
                        onUpdateSort(sort.id!, { fk_column_id: e.target.value })
                      }
                      className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      {filterableColumns.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.title}
                        </option>
                      ))}
                    </select>

                    {/* Direction */}
                    <select
                      value={sort.direction || "asc"}
                      onChange={(e) =>
                        onUpdateSort(sort.id!, {
                          direction: e.target.value as "asc" | "desc",
                        })
                      }
                      className="w-20 text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="asc">升序</option>
                      <option value="desc">降序</option>
                    </select>

                    {/* Remove */}
                    <button
                      onClick={() => onDeleteSort(sort.id!)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {sorts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => sorts.forEach(s => s.id && onDeleteSort(s.id))}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                清除全部
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export/Import */}
      {!readOnly && (
        <>
          <Button variant="ghost" size="sm" onClick={onExport}>
            <Download className="w-4 h-4 mr-1" />
            导出
          </Button>
          <Button variant="ghost" size="sm" onClick={onImport}>
            <Upload className="w-4 h-4 mr-1" />
            导入
          </Button>
        </>
      )}
    </div>
  );
}

// Export types for external use
export type { FilterCondition, FilterComparisonOp };
