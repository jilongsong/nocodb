"use client";

import { useState, useCallback } from "react";
import type { ColumnType, SortType } from "nocodb-sdk";
import {
  Filter,
  SortAsc,
  Plus,
  X,
  Trash2,
  Download,
  Upload,
} from "lucide-react";
import { SearchData } from "./SearchData";
import { Button } from "@/components/ui/button";
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

interface GridToolbarProps {
  columns: ColumnType[];
  filters: FilterCondition[];
  sorts: SortType[];
  searchQuery: string;
  searchField: string | null;
  onAddFilter: (columnId: string, comparisonOp?: FilterComparisonOp, value?: any) => void;
  onUpdateFilter: (filterId: string, updates: Partial<FilterCondition>) => void;
  onDeleteFilter: (filterId: string) => void;
  onAddSort: (columnId: string, direction?: "asc" | "desc") => void;
  onUpdateSort: (sortId: string, updates: Partial<SortType>) => void;
  onDeleteSort: (sortId: string) => void;
  onSearchChange: (query: string, field: string | null) => void;
  onExport?: () => void;
  onImport?: () => void;
  readOnly?: boolean;
}

export function GridToolbar({
  columns,
  filters,
  sorts,
  searchQuery,
  searchField,
  onAddFilter,
  onUpdateFilter,
  onDeleteFilter,
  onAddSort,
  onUpdateSort,
  onDeleteSort,
  onSearchChange,
  onExport,
  onImport,
  readOnly = false,
}: GridToolbarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const filterableColumns = columns.filter(
    (col) => !col.system && !col.title?.startsWith("nc_")
  );

  const handleAddFilter = useCallback(() => {
    if (filterableColumns.length === 0) return;
    onAddFilter(filterableColumns[0].id!, "eq", "");
  }, [filterableColumns, onAddFilter]);

  const handleAddSort = useCallback(() => {
    if (filterableColumns.length === 0) return;
    onAddSort(filterableColumns[0].id!, "asc");
  }, [filterableColumns, onAddSort]);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 h-10 bg-background border-b">
      <SearchData
        columns={columns}
        searchQuery={searchQuery}
        searchField={searchField}
        onSearchChange={onSearchChange}
      />

      {/* Filter */}
      <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className={filters.length > 0 ? "text-primary" : ""}>
            <Filter className="w-3.5 h-3.5 mr-1" />
            筛选
            {filters.length > 0 && (
              <span className="ml-1 px-1 text-[10px] bg-primary/10 text-primary rounded">
                {filters.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">筛选条件</span>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleAddFilter}>
                <Plus className="w-3 h-3 mr-1" />
                添加
              </Button>
            </div>
            {filters.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">暂无筛选条件</p>
            ) : (
              <div className="space-y-1.5">
                {filters.map((filter) => (
                  <div key={filter.id} className="flex items-center gap-1.5 p-1.5 bg-muted/50 rounded text-xs">
                    <select
                      value={filter.fk_column_id || ""}
                      onChange={(e) => onUpdateFilter(filter.id!, { fk_column_id: e.target.value })}
                      className="flex-1 h-6 text-xs border rounded px-1"
                    >
                      {filterableColumns.map((col) => (
                        <option key={col.id} value={col.id}>{col.title}</option>
                      ))}
                    </select>
                    <select
                      value={filter.comparison_op || "eq"}
                      onChange={(e) => onUpdateFilter(filter.id!, { comparison_op: e.target.value as FilterComparisonOp })}
                      className="w-20 h-6 text-xs border rounded px-1"
                    >
                      {FILTER_OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                    {!["null", "notnull", "empty", "notempty"].includes(filter.comparison_op || "") && (
                      <input
                        type="text"
                        value={filter.value || ""}
                        onChange={(e) => onUpdateFilter(filter.id!, { value: e.target.value })}
                        placeholder="值"
                        className="w-16 h-6 text-xs border rounded px-1"
                      />
                    )}
                    <button onClick={() => onDeleteFilter(filter.id!)} className="p-0.5 hover:bg-muted rounded">
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {filters.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-destructive"
                onClick={() => filters.forEach(f => f.id && onDeleteFilter(f.id))}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                清除全部
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Sort */}
      <Popover open={isSortOpen} onOpenChange={setIsSortOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className={sorts.length > 0 ? "text-primary" : ""}>
            <SortAsc className="w-3.5 h-3.5 mr-1" />
            排序
            {sorts.length > 0 && (
              <span className="ml-1 px-1 text-[10px] bg-primary/10 text-primary rounded">
                {sorts.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">排序条件</span>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleAddSort}>
                <Plus className="w-3 h-3 mr-1" />
                添加
              </Button>
            </div>
            {sorts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">暂无排序条件</p>
            ) : (
              <div className="space-y-1.5">
                {sorts.map((sort) => (
                  <div key={sort.id} className="flex items-center gap-1.5 p-1.5 bg-muted/50 rounded text-xs">
                    <select
                      value={sort.fk_column_id || ""}
                      onChange={(e) => onUpdateSort(sort.id!, { fk_column_id: e.target.value })}
                      className="flex-1 h-6 text-xs border rounded px-1"
                    >
                      {filterableColumns.map((col) => (
                        <option key={col.id} value={col.id}>{col.title}</option>
                      ))}
                    </select>
                    <select
                      value={sort.direction || "asc"}
                      onChange={(e) => onUpdateSort(sort.id!, { direction: e.target.value as "asc" | "desc" })}
                      className="w-16 h-6 text-xs border rounded px-1"
                    >
                      <option value="asc">升序</option>
                      <option value="desc">降序</option>
                    </select>
                    <button onClick={() => onDeleteSort(sort.id!)} className="p-0.5 hover:bg-muted rounded">
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex-1" />

      {!readOnly && (
        <>
          {onExport && (
            <Button variant="ghost" size="sm" onClick={onExport}>
              <Download className="w-3.5 h-3.5 mr-1" />
              导出
            </Button>
          )}
          {onImport && (
            <Button variant="ghost" size="sm" onClick={onImport}>
              <Upload className="w-3.5 h-3.5 mr-1" />
              导入
            </Button>
          )}
        </>
      )}
    </div>
  );
}

export default GridToolbar;
