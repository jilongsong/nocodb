"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { ColumnType, ViewType } from "nocodb-sdk";
import { isSystemColumn } from "nocodb-sdk";
import { useApi } from "../useApi";

interface GridViewColumn {
  id?: string;
  fk_column_id?: string;
  fk_view_id?: string;
  order?: number;
  show?: boolean;
  width?: string;
  group_by?: boolean;
  group_by_order?: number;
  group_by_sort?: string;
}

interface UseViewColumnsOptions {
  viewId?: string;
  tableId: string;
  columns: ColumnType[];
}

export function useViewColumns({ viewId, tableId, columns }: UseViewColumnsOptions) {
  const { api } = useApi({ useGlobalInstance: true });
  
  const [gridViewCols, setGridViewCols] = useState<Record<string, GridViewColumn>>({});
  const [isLoading, setIsLoading] = useState(false);
  const resizingColOldWidth = useRef<string>("180px");

  // Load view columns from API
  const loadViewColumns = useCallback(async () => {
    if (!viewId) return;
    
    setIsLoading(true);
    try {
      const response = await api.dbViewColumn.list(viewId);
      const cols = (response.list || []) as GridViewColumn[];
      
      const colsMap = cols.reduce<Record<string, GridViewColumn>>((acc, col) => {
        if (col.fk_column_id) {
          acc[col.fk_column_id] = col;
        }
        return acc;
      }, {});
      
      setGridViewCols(colsMap);
    } catch (e) {
      console.error("Failed to load view columns:", e);
    } finally {
      setIsLoading(false);
    }
  }, [api, viewId]);

  // Update grid view column (width, order, show, etc.)
  const updateGridViewColumn = useCallback(
    async (columnId: string, props: Partial<GridViewColumn>) => {
      const viewCol = gridViewCols[columnId];
      if (!viewCol?.id || !viewId) return;

      try {
        // Update local state immediately for responsiveness
        setGridViewCols((prev) => ({
          ...prev,
          [columnId]: { ...prev[columnId], ...props },
        }));

        // Sync with server
        await api.dbView.gridColumnUpdate(viewCol.id, props);
      } catch (e) {
        console.error("Failed to update grid view column:", e);
        // Revert on error
        await loadViewColumns();
      }
    },
    [api, viewId, gridViewCols, loadViewColumns]
  );

  // Update column width
  const updateColumnWidth = useCallback(
    async (columnId: string, width: number) => {
      resizingColOldWidth.current = gridViewCols[columnId]?.width || "180px";
      await updateGridViewColumn(columnId, { width: `${width}px` });
    },
    [gridViewCols, updateGridViewColumn]
  );

  // Hide column
  const hideColumn = useCallback(
    async (columnId: string) => {
      await updateGridViewColumn(columnId, { show: false });
    },
    [updateGridViewColumn]
  );

  // Show column
  const showColumn = useCallback(
    async (columnId: string) => {
      await updateGridViewColumn(columnId, { show: true });
    },
    [updateGridViewColumn]
  );

  // Filter visible columns (exclude system columns and hidden columns)
  const visibleColumns = useMemo(() => {
    return columns.filter((col) => {
      // Always hide system columns like nc_* prefixed columns
      if (col.system || col.title?.startsWith("nc_")) return false;
      
      // Hide columns marked as hidden in view
      const viewCol = gridViewCols[col.id!];
      if (viewCol && viewCol.show === false) return false;
      
      return true;
    });
  }, [columns, gridViewCols]);

  // Sort columns by order
  const sortedColumns = useMemo(() => {
    return [...visibleColumns].sort((a, b) => {
      const orderA = gridViewCols[a.id!]?.order ?? Infinity;
      const orderB = gridViewCols[b.id!]?.order ?? Infinity;
      return orderA - orderB;
    });
  }, [visibleColumns, gridViewCols]);

  // Reorder column - move column to a new position
  const reorderColumn = useCallback(
    async (draggedColumnId: string, targetColumnId: string) => {
      const draggedViewCol = gridViewCols[draggedColumnId];
      const targetViewCol = gridViewCols[targetColumnId];
      
      if (!draggedViewCol || !targetViewCol) return;

      // Find target column index
      const targetIndex = sortedColumns.findIndex((c) => c.id === targetColumnId);
      if (targetIndex === -1) return;

      // Calculate new order (between target and next column)
      const nextColumn = sortedColumns[targetIndex + 1];
      const nextViewCol = nextColumn ? gridViewCols[nextColumn.id!] : null;
      
      let newOrder: number;
      if (nextViewCol) {
        // Insert between target and next
        newOrder = (targetViewCol.order || 0) + ((nextViewCol.order || 0) - (targetViewCol.order || 0)) / 2;
      } else {
        // Insert at end
        newOrder = (targetViewCol.order || 0) + 1;
      }

      await updateGridViewColumn(draggedColumnId, { order: newOrder });
    },
    [gridViewCols, sortedColumns, updateGridViewColumn]
  );

  // Get column order for inserting before/after a column
  const getInsertPosition = useCallback(
    (columnId: string, position: 'before' | 'after'): { column_order: { view_id: string; order: number } } | undefined => {
      if (!viewId) return undefined;
      
      const targetIndex = sortedColumns.findIndex((c) => c.id === columnId);
      if (targetIndex === -1) return undefined;

      const targetViewCol = gridViewCols[columnId];
      if (!targetViewCol) return undefined;

      let order: number;
      
      if (position === 'before') {
        // Insert before target column
        const prevColumn = sortedColumns[targetIndex - 1];
        const prevViewCol = prevColumn ? gridViewCols[prevColumn.id!] : null;
        
        if (prevViewCol) {
          order = ((prevViewCol.order || 0) + (targetViewCol.order || 0)) / 2;
        } else {
          order = (targetViewCol.order || 1) - 1;
        }
      } else {
        // Insert after target column
        const nextColumn = sortedColumns[targetIndex + 1];
        const nextViewCol = nextColumn ? gridViewCols[nextColumn.id!] : null;
        
        if (nextViewCol) {
          order = ((targetViewCol.order || 0) + (nextViewCol.order || 0)) / 2;
        } else {
          order = (targetViewCol.order || 0) + 1;
        }
      }

      return {
        column_order: {
          view_id: viewId,
          order,
        },
      };
    },
    [viewId, sortedColumns, gridViewCols]
  );

  // Get column width
  const getColumnWidth = useCallback(
    (columnId: string, defaultWidth = 180): number => {
      const width = gridViewCols[columnId]?.width;
      if (!width) return defaultWidth;
      return parseInt(width.replace("px", ""), 10) || defaultWidth;
    },
    [gridViewCols]
  );

  // Load view columns when viewId changes
  useEffect(() => {
    if (viewId) {
      loadViewColumns();
    }
  }, [viewId, loadViewColumns]);

  return {
    gridViewCols,
    isLoading,
    loadViewColumns,
    updateGridViewColumn,
    updateColumnWidth,
    hideColumn,
    showColumn,
    reorderColumn,
    getInsertPosition,
    getColumnWidth,
    visibleColumns,
    sortedColumns,
  };
}

export type UseViewColumnsReturn = ReturnType<typeof useViewColumns>;
