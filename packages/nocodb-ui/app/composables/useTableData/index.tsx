"use client";

import { useState, useCallback, useRef } from "react";
import type { ColumnType, TableType } from "nocodb-sdk";
import { useApi } from "../useApi";
import type {
  Row,
  PaginationData,
  ActiveCell,
  LoadDataParams,
  UseTableDataOptions,
} from "./types";

// Format raw data to Row structure
const formatData = (list: Record<string, any>[]): Row[] =>
  list.map((row, index) => ({
    row: { ...row },
    oldRow: { ...row },
    rowMeta: { rowIndex: index },
  }));

// Extract primary key from row
export const extractPkFromRow = (
  row: Record<string, any>,
  columns: ColumnType[]
): string | null => {
  if (!row || !columns) return null;
  const pkColumns = columns.filter((c) => c.pk);
  if (pkColumns.length === 0) return null;
  
  const pkValues = pkColumns.map((c) => row[c.title!]);
  if (pkValues.some((v) => v === null || v === undefined)) return null;
  
  return pkValues.join("___");
};

// Generate default row data based on columns
export const rowDefaultData = (columns?: ColumnType[]): Record<string, any> => {
  if (!columns) return {};
  
  return columns.reduce((acc, col) => {
    if (col.cdf !== undefined && col.cdf !== null) {
      acc[col.title!] = col.cdf;
    } else {
      acc[col.title!] = null;
    }
    return acc;
  }, {} as Record<string, any>);
};

export function useTableData(options: UseTableDataOptions) {
  const { tableId, viewId, baseId, pageSize: defaultPageSize = 25 } = options;
  const { api } = useApi({ useGlobalInstance: true });

  // State
  const [rows, setRows] = useState<Row[]>([]);
  const [columns, setColumns] = useState<ColumnType[]>([]);
  const [tableMeta, setTableMeta] = useState<TableType | null>(null);
  const [paginationData, setPaginationData] = useState<PaginationData>({
    page: 1,
    pageSize: defaultPageSize,
    totalRows: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCell, setActiveCell] = useState<ActiveCell>({ row: null, col: null });
  const [editingCell, setEditingCell] = useState<ActiveCell>({ row: null, col: null });
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Refs for abort controller
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load table metadata
  const loadTableMeta = useCallback(async () => {
    try {
      const meta = await api.dbTable.read(tableId);
      setTableMeta(meta);
      setColumns(meta.columns || []);
      return meta;
    } catch (e: any) {
      console.error("Failed to load table meta:", e);
      setError(e.message || "Failed to load table metadata");
      return null;
    }
  }, [api, tableId]);

  // Load data
  const loadData = useCallback(
    async (params: LoadDataParams = {}, shouldShowLoading = true) => {
      if (!baseId || !tableId) return;

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      if (shouldShowLoading) setIsLoading(true);
      setError(null);

      try {
        const offset = params.offset ?? (paginationData.page - 1) * paginationData.pageSize;
        const limit = params.limit ?? paginationData.pageSize;

        const response = await api.dbTableRow.list("noco", baseId, tableId, {
          offset,
          limit,
          where: params.where,
        });

        const formattedRows = formatData(response.list || []);
        setRows(formattedRows);

        if (response.pageInfo) {
          setPaginationData((prev) => ({
            ...prev,
            totalRows: response.pageInfo.totalRows,
            isFirstPage: response.pageInfo.isFirstPage,
            isLastPage: response.pageInfo.isLastPage,
          }));
        }
      } catch (e: any) {
        if (e.name !== "AbortError") {
          console.error("Failed to load data:", e);
          setError(e.message || "Failed to load data");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [api, baseId, tableId, paginationData.page, paginationData.pageSize]
  );

  // Reload data
  const reloadData = useCallback(async () => {
    await loadData({}, true);
  }, [loadData]);

  // Change page
  const changePage = useCallback(
    async (page: number) => {
      setPaginationData((prev) => ({ ...prev, page }));
      await loadData({
        offset: (page - 1) * paginationData.pageSize,
      });
    },
    [loadData, paginationData.pageSize]
  );

  // Change page size
  const changePageSize = useCallback(
    async (pageSize: number) => {
      setPaginationData((prev) => ({ ...prev, pageSize, page: 1 }));
      await loadData({ offset: 0, limit: pageSize });
    },
    [loadData]
  );

  // Add empty row
  const addEmptyRow = useCallback(
    (index?: number) => {
      const newRow: Row = {
        row: rowDefaultData(columns),
        oldRow: {},
        rowMeta: { new: true },
      };

      setRows((prev) => {
        const insertIndex = index ?? prev.length;
        const newRows = [...prev];
        newRows.splice(insertIndex, 0, newRow);
        return newRows;
      });

      return newRow;
    },
    [columns]
  );

  // Insert row (save to database)
  const insertRow = useCallback(
    async (row: Row) => {
      if (!baseId || !tableId) return null;

      try {
        row.rowMeta.saving = true;
        setRows((prev) => [...prev]); // Trigger re-render

        const insertedData = await api.dbTableRow.create(
          "noco",
          baseId,
          tableId,
          row.row
        );

        // Update the row with inserted data
        setRows((prev) =>
          prev.map((r) =>
            r === row
              ? {
                  row: { ...insertedData },
                  oldRow: { ...insertedData },
                  rowMeta: { ...r.rowMeta, new: false, saving: false },
                }
              : r
          )
        );

        // Update total count
        setPaginationData((prev) => ({
          ...prev,
          totalRows: (prev.totalRows || 0) + 1,
        }));

        return insertedData;
      } catch (e: any) {
        console.error("Failed to insert row:", e);
        row.rowMeta.saving = false;
        setRows((prev) => [...prev]); // Trigger re-render
        throw e;
      }
    },
    [api, baseId, tableId]
  );

  // Update row property
  const updateRow = useCallback(
    async (row: Row, property: string) => {
      if (!baseId || !tableId) return null;

      const pkValue = extractPkFromRow(row.row, columns);
      if (!pkValue) {
        console.error("Cannot update row without primary key");
        return null;
      }

      try {
        row.rowMeta.saving = true;
        setRows((prev) => [...prev]);

        const updateData = { [property]: row.row[property] };
        const updatedData = await api.dbTableRow.update(
          "noco",
          baseId,
          tableId,
          pkValue,
          updateData
        );

        // Update the row
        setRows((prev) =>
          prev.map((r) =>
            r === row
              ? {
                  ...r,
                  row: { ...r.row, ...updatedData },
                  oldRow: { ...r.row, ...updatedData },
                  rowMeta: { ...r.rowMeta, saving: false, changed: false },
                }
              : r
          )
        );

        return updatedData;
      } catch (e: any) {
        console.error("Failed to update row:", e);
        // Revert the change
        row.row[property] = row.oldRow[property];
        row.rowMeta.saving = false;
        setRows((prev) => [...prev]);
        throw e;
      }
    },
    [api, baseId, tableId, columns]
  );

  // Delete row by index
  const deleteRow = useCallback(
    async (rowIndex: number) => {
      const row = rows[rowIndex];
      if (!row) return;

      // If it's a new row, just remove it from state
      if (row.rowMeta.new) {
        setRows((prev) => prev.filter((_, i) => i !== rowIndex));
        return;
      }

      const pkValue = extractPkFromRow(row.row, columns);
      if (!pkValue || !baseId || !tableId) return;

      try {
        await api.dbTableRow.delete("noco", baseId, tableId, pkValue);
        setRows((prev) => prev.filter((_, i) => i !== rowIndex));
        setPaginationData((prev) => ({
          ...prev,
          totalRows: Math.max(0, (prev.totalRows || 0) - 1),
        }));
      } catch (e: any) {
        console.error("Failed to delete row:", e);
        throw e;
      }
    },
    [api, baseId, tableId, rows, columns]
  );

  // Delete row by ID
  const deleteRowById = useCallback(
    async (id: string) => {
      if (!baseId || !tableId) return;

      try {
        await api.dbTableRow.delete("noco", baseId, tableId, id);
        setRows((prev) =>
          prev.filter((r) => extractPkFromRow(r.row, columns) !== id)
        );
        setPaginationData((prev) => ({
          ...prev,
          totalRows: Math.max(0, (prev.totalRows || 0) - 1),
        }));
      } catch (e: any) {
        console.error("Failed to delete row:", e);
        throw e;
      }
    },
    [api, baseId, tableId, columns]
  );

  // Delete selected rows
  const deleteSelectedRows = useCallback(async () => {
    const rowsToDelete = rows.filter((r) => r.rowMeta.selected);
    
    for (const row of rowsToDelete) {
      const pkValue = extractPkFromRow(row.row, columns);
      if (pkValue && !row.rowMeta.new) {
        try {
          await api.dbTableRow.delete("noco", baseId, tableId, pkValue);
        } catch (e) {
          console.error("Failed to delete row:", e);
        }
      }
    }

    setRows((prev) => prev.filter((r) => !r.rowMeta.selected));
    setPaginationData((prev) => ({
      ...prev,
      totalRows: Math.max(0, (prev.totalRows || 0) - rowsToDelete.length),
    }));
    setSelectedRows(new Set());
  }, [api, baseId, tableId, rows, columns]);

  // Update cell value
  const updateCell = useCallback(
    async (rowIndex: number, columnTitle: string, value: any) => {
      const row = rows[rowIndex];
      if (!row) return;

      // Update local state first
      const oldValue = row.row[columnTitle];
      row.row[columnTitle] = value;
      row.rowMeta.changed = true;
      setRows((prev) => [...prev]);

      // If it's a new row, don't save to database yet
      if (row.rowMeta.new) return;

      try {
        await updateRow(row, columnTitle);
      } catch (e) {
        // Revert on error
        row.row[columnTitle] = oldValue;
        row.rowMeta.changed = false;
        setRows((prev) => [...prev]);
      }
    },
    [rows, updateRow]
  );

  // Clear cell value
  const clearCell = useCallback(
    async (rowIndex: number, columnTitle: string) => {
      await updateCell(rowIndex, columnTitle, null);
    },
    [updateCell]
  );

  // Select row
  const selectRow = useCallback((rowIndex: number, selected: boolean) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === rowIndex ? { ...r, rowMeta: { ...r.rowMeta, selected } } : r
      )
    );
  }, []);

  // Select all rows
  const selectAllRows = useCallback((selected: boolean) => {
    setRows((prev) =>
      prev.map((r) => ({ ...r, rowMeta: { ...r.rowMeta, selected } }))
    );
  }, []);

  // Add column
  const addColumn = useCallback(
    async (columnData: Partial<ColumnType>, position?: number) => {
      if (!tableId) return;

      try {
        const newColumn = await api.dbTableColumn.create(tableId, {
          ...columnData,
          column_order: position ? { order: position } : undefined,
        } as any);

        // Reload table meta to get updated columns
        await loadTableMeta();
        return newColumn;
      } catch (e: any) {
        console.error("Failed to add column:", e);
        throw e;
      }
    },
    [api, tableId, loadTableMeta]
  );

  // Update column
  const updateColumn = useCallback(
    async (columnId: string, data: Partial<ColumnType>) => {
      try {
        await api.dbTableColumn.update(columnId, data as any);
        await loadTableMeta();
      } catch (e: any) {
        console.error("Failed to update column:", e);
        throw e;
      }
    },
    [api, loadTableMeta]
  );

  // Delete column
  const deleteColumn = useCallback(
    async (columnId: string) => {
      try {
        await api.dbTableColumn.delete(columnId);
        await loadTableMeta();
      } catch (e: any) {
        console.error("Failed to delete column:", e);
        throw e;
      }
    },
    [api, loadTableMeta]
  );

  // Reorder column
  const reorderColumn = useCallback(
    async (columnId: string, newOrder: number) => {
      try {
        await api.dbTableColumn.update(columnId, {
          column_order: { order: newOrder },
        } as any);
        await loadTableMeta();
      } catch (e: any) {
        console.error("Failed to reorder column:", e);
        throw e;
      }
    },
    [api, loadTableMeta]
  );

  // Get display columns (non-system columns)
  const displayColumns = columns.filter(
    (col) => !col.system && !col.title?.startsWith("nc_")
  );

  // Check if all rows are selected
  const allRowsSelected = rows.length > 0 && rows.every((r) => r.rowMeta.selected);

  return {
    // State
    rows,
    columns,
    displayColumns,
    tableMeta,
    paginationData,
    isLoading,
    isLoadingMore,
    error,
    activeCell,
    editingCell,
    selectedRows,
    allRowsSelected,

    // Actions
    loadTableMeta,
    loadData,
    reloadData,
    changePage,
    changePageSize,
    addEmptyRow,
    insertRow,
    updateRow,
    deleteRow,
    deleteRowById,
    deleteSelectedRows,
    updateCell,
    clearCell,
    selectRow,
    selectAllRows,
    setActiveCell: (row: number | null, col: number | null) =>
      setActiveCell({ row, col }),
    setEditingCell: (row: number | null, col: number | null) =>
      setEditingCell({ row, col }),
    addColumn,
    updateColumn,
    deleteColumn,
    reorderColumn,
  };
}

export type UseTableDataReturn = ReturnType<typeof useTableData>;
