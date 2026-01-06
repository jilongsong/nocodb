"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { ColumnType } from "nocodb-sdk";
import { UITypes } from "nocodb-sdk";
import { Plus, Loader2 } from "lucide-react";
import { Cell } from "./Cell";
import { ColumnHeader } from "./header/ColumnHeader";
import type { Row } from "@/app/composables/useTableData/types";

// Column width constants
const MIN_COLUMN_WIDTH = 100;
const DEFAULT_COLUMN_WIDTH = 180;
const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 40;
const ROW_NUMBER_WIDTH = 50;

interface GridProps {
  rows: Row[];
  columns: ColumnType[];
  isLoading?: boolean;
  activeCell?: { row: number | null; col: number | null };
  editingCell?: { row: number | null; col: number | null };
  allRowsSelected?: boolean;
  onCellClick?: (rowIndex: number, colIndex: number) => void;
  onCellDoubleClick?: (rowIndex: number, colIndex: number) => void;
  onCellChange?: (rowIndex: number, columnTitle: string, value: any) => void;
  onRowSelect?: (rowIndex: number, selected: boolean) => void;
  onSelectAllRows?: (selected: boolean) => void;
  onAddRow?: () => void;
  onDeleteRow?: (rowIndex: number) => void;
  onAddColumn?: () => void;
  onColumnResize?: (columnId: string, width: number) => void;
  onColumnClick?: (column: ColumnType) => void;
  readOnly?: boolean;
}

export function Grid({
  rows,
  columns,
  isLoading = false,
  activeCell = { row: null, col: null },
  editingCell = { row: null, col: null },
  allRowsSelected = false,
  onCellClick,
  onCellDoubleClick,
  onCellChange,
  onRowSelect,
  onSelectAllRows,
  onAddRow,
  onDeleteRow,
  onAddColumn,
  onColumnResize,
  onColumnClick,
  readOnly = false,
}: GridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  // Filter display columns
  const displayColumns = useMemo(
    () => columns.filter((col) => !col.system && !col.title?.startsWith("nc_")),
    [columns]
  );

  // Get column width
  const getColumnWidth = useCallback(
    (column: ColumnType) => {
      return columnWidths[column.id!] || DEFAULT_COLUMN_WIDTH;
    },
    [columnWidths]
  );

  // Handle column resize start
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, column: ColumnType) => {
      e.preventDefault();
      e.stopPropagation();
      setResizingColumn(column.id!);
      setResizeStartX(e.clientX);
      setResizeStartWidth(getColumnWidth(column));
    },
    [getColumnWidth]
  );

  // Handle column resize move
  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizeStartX;
      const newWidth = Math.max(MIN_COLUMN_WIDTH, resizeStartWidth + diff);
      setColumnWidths((prev) => ({
        ...prev,
        [resizingColumn]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      if (resizingColumn && onColumnResize) {
        onColumnResize(resizingColumn, columnWidths[resizingColumn] || DEFAULT_COLUMN_WIDTH);
      }
      setResizingColumn(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingColumn, resizeStartX, resizeStartWidth, columnWidths, onColumnResize]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeCell.row === null || activeCell.col === null) return;
      if (editingCell.row !== null) return; // Don't navigate while editing

      const { row, col } = activeCell;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          if (row > 0) onCellClick?.(row - 1, col);
          break;
        case "ArrowDown":
          e.preventDefault();
          if (row < rows.length - 1) onCellClick?.(row + 1, col);
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (col > 0) onCellClick?.(row, col - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          if (col < displayColumns.length - 1) onCellClick?.(row, col + 1);
          break;
        case "Enter":
          e.preventDefault();
          onCellDoubleClick?.(row, col);
          break;
        case "Escape":
          e.preventDefault();
          break;
        case "Delete":
        case "Backspace":
          if (!readOnly) {
            e.preventDefault();
            const column = displayColumns[col];
            if (column?.title) {
              onCellChange?.(row, column.title, null);
            }
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCell, editingCell, rows.length, displayColumns, onCellClick, onCellDoubleClick, onCellChange, readOnly]);

  // Calculate total width
  const totalWidth = useMemo(() => {
    return (
      ROW_NUMBER_WIDTH +
      displayColumns.reduce((sum, col) => sum + getColumnWidth(col), 0) +
      50 // Add column button
    );
  }, [displayColumns, getColumnWidth]);

  if (isLoading && rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div
      ref={gridRef}
      className="overflow-auto h-full bg-white"
      style={{ minWidth: "100%" }}
    >
      <div style={{ minWidth: totalWidth }}>
        {/* Header Row */}
        <div
          className="flex sticky top-0 z-20 bg-gray-50 border-b border-gray-200"
          style={{ height: HEADER_HEIGHT }}
        >
          {/* Checkbox / Row Number Header */}
          <div
            className="flex items-center justify-center border-r border-gray-200 bg-gray-50 sticky left-0 z-30"
            style={{ width: ROW_NUMBER_WIDTH, minWidth: ROW_NUMBER_WIDTH }}
          >
            <input
              type="checkbox"
              checked={allRowsSelected}
              onChange={(e) => onSelectAllRows?.(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>

          {/* Column Headers */}
          {displayColumns.map((column, colIndex) => (
            <div
              key={column.id}
              className="border-r border-gray-200"
              style={{
                width: getColumnWidth(column),
                minWidth: getColumnWidth(column),
              }}
            >
              <ColumnHeader
                column={column}
                width={getColumnWidth(column)}
                isResizing={resizingColumn === column.id}
                onResizeStart={(e) => handleResizeStart(e, column)}
                onEdit={() => onColumnClick?.(column)}
                readOnly={readOnly}
              />
            </div>
          ))}

          {/* Add Column Button */}
          {!readOnly && (
            <div
              className="flex items-center justify-center cursor-pointer hover:bg-gray-100 border-r border-gray-200"
              style={{ width: 50 }}
              onClick={onAddColumn}
            >
              <Plus className="w-4 h-4 text-gray-400" />
            </div>
          )}
        </div>

        {/* Data Rows */}
        {rows.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-500">
            <div className="text-center">
              <p className="mb-4">暂无数据</p>
              {!readOnly && (
                <button
                  onClick={onAddRow}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <Plus className="w-4 h-4" />
                  添加行
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            {rows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className={`flex border-b border-gray-100 hover:bg-blue-50/30 ${
                  row.rowMeta.selected ? "bg-blue-50" : ""
                }`}
                style={{ height: ROW_HEIGHT }}
              >
                {/* Row Number / Checkbox */}
                <div
                  className="flex items-center justify-center border-r border-gray-100 bg-gray-50 sticky left-0 z-10 group"
                  style={{ width: ROW_NUMBER_WIDTH, minWidth: ROW_NUMBER_WIDTH }}
                >
                  <div className="group-hover:hidden text-xs text-gray-400">
                    {rowIndex + 1}
                  </div>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={row.rowMeta.selected || false}
                      onChange={(e) => onRowSelect?.(rowIndex, e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Cells */}
                {displayColumns.map((column, colIndex) => {
                  const isActive =
                    activeCell.row === rowIndex && activeCell.col === colIndex;
                  const isEditing =
                    editingCell.row === rowIndex && editingCell.col === colIndex;

                  return (
                    <div
                      key={column.id}
                      className={`relative border-r border-gray-100 ${
                        isActive ? "ring-2 ring-blue-500 ring-inset z-10" : ""
                      }`}
                      style={{
                        width: getColumnWidth(column),
                        minWidth: getColumnWidth(column),
                      }}
                      onClick={() => onCellClick?.(rowIndex, colIndex)}
                      onDoubleClick={() => onCellDoubleClick?.(rowIndex, colIndex)}
                    >
                      <Cell
                        value={row.row[column.title!]}
                        column={column}
                        isEditing={isEditing}
                        isActive={isActive}
                        readOnly={readOnly || column.readonly}
                        onChange={(value) =>
                          onCellChange?.(rowIndex, column.title!, value)
                        }
                      />
                    </div>
                  );
                })}

                {/* Empty cell for add column */}
                <div style={{ width: 50 }} />
              </div>
            ))}

            {/* Add Row Button */}
            {!readOnly && (
              <div
                className="flex items-center border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                style={{ height: ROW_HEIGHT }}
                onClick={onAddRow}
              >
                <div
                  className="flex items-center justify-center border-r border-gray-100"
                  style={{ width: ROW_NUMBER_WIDTH }}
                >
                  <Plus className="w-4 h-4 text-gray-300" />
                </div>
                <div className="flex-1 px-3 text-sm text-gray-400">
                  点击添加新行
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

