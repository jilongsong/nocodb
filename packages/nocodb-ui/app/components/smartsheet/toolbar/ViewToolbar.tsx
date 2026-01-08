"use client";

import { ViewTypes } from "nocodb-sdk";
import type { ColumnType, SortType, ViewType } from "nocodb-sdk";
import { GridToolbar } from "./GridToolbar";
import { FormToolbar } from "./FormToolbar";
import type { FilterCondition, FilterComparisonOp } from "@/app/composables/useViewFilters";

export interface BaseToolbarProps {
  viewType: ViewTypes;
  viewId?: string;
  tableId: string;
  tableName?: string;
  columns: ColumnType[];
  readOnly?: boolean;
}

export interface GridToolbarProps extends BaseToolbarProps {
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
}

export interface FormToolbarProps extends BaseToolbarProps {
  sharedViewId?: string;
  onShare?: () => void;
  onPreview?: () => void;
}

export type ViewToolbarProps = 
  | (GridToolbarProps & { viewType: ViewTypes.GRID })
  | (FormToolbarProps & { viewType: ViewTypes.FORM })
  | (BaseToolbarProps & { viewType: ViewTypes.GALLERY | ViewTypes.KANBAN | ViewTypes.CALENDAR });

export function ViewToolbar(props: ViewToolbarProps) {
  const { viewType } = props;

  switch (viewType) {
    case ViewTypes.GRID:
      return <GridToolbar {...(props as GridToolbarProps)} />;
    case ViewTypes.FORM:
      return <FormToolbar {...(props as FormToolbarProps)} />;
    case ViewTypes.GALLERY:
    case ViewTypes.KANBAN:
    case ViewTypes.CALENDAR:
      // Placeholder for other view types
      return (
        <div className="flex items-center gap-2 px-4 py-2 h-10 bg-background border-b text-sm text-muted-foreground">
          {viewType} 视图工具栏 (开发中)
        </div>
      );
    default:
      return null;
  }
}

export default ViewToolbar;
