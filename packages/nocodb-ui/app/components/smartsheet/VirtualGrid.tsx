"use client";

import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import type { ColumnType } from "nocodb-sdk";
import { UITypes } from "nocodb-sdk";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { Cell } from "./Cell";
import { ColumnHeader } from "./header/ColumnHeader";
import type { Row } from "@/app/composables/useTableData/types";

// Constants
const MIN_COLUMN_WIDTH = 60;
const DEFAULT_COLUMN_WIDTH = 180;
const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 40;
const ROW_NUMBER_WIDTH = 60;
const BUFFER_ROWS = 5;
const CHUNK_SIZE = 50;

// Column width constraints by type
const COLUMN_WIDTH_LIMITS: Record<string, { min: number; max: number }> = {
  [UITypes.Attachment]: { min: 100, max: Infinity },
  [UITypes.Button]: { min: 100, max: 320 },
  default: { min: MIN_COLUMN_WIDTH, max: Infinity },
};

const getColumnWidthLimit = (uidt?: string) => {
  if (uidt && uidt in COLUMN_WIDTH_LIMITS) {
    return COLUMN_WIDTH_LIMITS[uidt];
  }
  return COLUMN_WIDTH_LIMITS.default;
};

export const normalizeWidth = (uidt: string | undefined, width: number): number => {
  const { min, max } = getColumnWidthLimit(uidt);
  return Math.min(Math.max(width, min), max);
};

interface VirtualGridProps {
  rows: Row[];
  columns: ColumnType[];
  totalRows: number;
  isLoading?: boolean;
  activeCell?: { row: number | null; col: number | null };
  editingCell?: { row: number | null; col: number | null };
  allRowsSelected?: boolean;
  columnWidths?: Record<string, number>;
  onCellClick?: (rowIndex: number, colIndex: number) => void;
  onCellDoubleClick?: (rowIndex: number, colIndex: number) => void;
  onCellChange?: (rowIndex: number, columnTitle: string, value: any) => void;
  onRowSelect?: (rowIndex: number, selected: boolean) => void;
  onSelectAllRows?: (selected: boolean) => void;
  onAddRow?: () => void;
  onDeleteRow?: (rowIndex: number) => void;
  onDeleteSelectedRows?: () => void;
  onAddColumn?: () => void;
  onColumnClick?: (column: ColumnType) => void;
  onColumnResize?: (columnId: string, width: number) => void;
  onColumnResizeEnd?: (columnId: string, width: number) => void;
  onHideColumn?: (columnId: string) => void;
  onSortColumn?: (columnId: string, direction: 'asc' | 'desc') => void;
  onDuplicateColumn?: (columnId: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  onInsertColumnBefore?: (columnId: string) => void;
  onInsertColumnAfter?: (columnId: string) => void;
  onReorderColumn?: (draggedColumnId: string, targetColumnId: string) => void;
  onInsertRowAbove?: (rowIndex: number) => void;
  onInsertRowBelow?: (rowIndex: number) => void;
  onLoadMore?: (startIndex: number, endIndex: number) => void;
  readOnly?: boolean;
}

// Memoized Row Component for performance
const GridRow = memo(function GridRow({
  row,
  rowIndex,
  columns,
  getColumnWidth,
  activeCell,
  editingCell,
  readOnly,
  onCellClick,
  onCellDoubleClick,
  onCellChange,
  onRowSelect,
  onDeleteRow,
}: {
  row: Row;
  rowIndex: number;
  columns: ColumnType[];
  getColumnWidth: (column: ColumnType) => number;
  activeCell: { row: number | null; col: number | null };
  editingCell: { row: number | null; col: number | null };
  readOnly: boolean;
  onCellClick?: (rowIndex: number, colIndex: number) => void;
  onCellDoubleClick?: (rowIndex: number, colIndex: number) => void;
  onCellChange?: (rowIndex: number, columnTitle: string, value: any) => void;
  onRowSelect?: (rowIndex: number, selected: boolean) => void;
  onDeleteRow?: (rowIndex: number) => void;
}) {
  const isSelected = row.rowMeta?.selected;
  const isSaving = row.rowMeta?.saving;

  return (
    <div
      className={`flex border-b border-gray-100 transition-colors duration-150 ${
        isSelected 
          ? "bg-blue-50/70 hover:bg-blue-50" 
          : "hover:bg-slate-50/80"
      } ${isSaving ? "opacity-50" : ""}`}
      style={{ height: ROW_HEIGHT }}
    >
      {/* Row Number / Checkbox */}
      <div
        className="flex items-center justify-center border-r border-gray-100 bg-gray-50/50 sticky left-0 z-10 group"
        style={{ width: ROW_NUMBER_WIDTH, minWidth: ROW_NUMBER_WIDTH }}
      >
        <div className="flex items-center justify-center w-full">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onRowSelect?.(rowIndex, e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 opacity-0 group-hover:opacity-100 checked:opacity-100 transition-opacity cursor-pointer"
          />
          <span className={`absolute text-xs font-medium text-gray-400 group-hover:opacity-0 transition-opacity ${
            isSelected ? "opacity-0" : ""
          }`}>
            {rowIndex + 1}
          </span>
        </div>
        {!readOnly && (
          <button
            onClick={() => onDeleteRow?.(rowIndex)}
            className="absolute right-1 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded-md transition-all"
            title="删除行"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        )}
      </div>

      {/* Cells */}
      {columns.map((column, colIndex) => {
        const isActive = activeCell.row === rowIndex && activeCell.col === colIndex;
        const isEditing = editingCell.row === rowIndex && editingCell.col === colIndex;
        const width = getColumnWidth(column);

        return (
          <div
            key={column.id}
            className={`relative border-r border-gray-100 transition-shadow ${
              isActive 
                ? "ring-2 ring-blue-500 ring-inset z-10 bg-white" 
                : ""
            }`}
            style={{ width, minWidth: width, height: ROW_HEIGHT }}
            onClick={() => onCellClick?.(rowIndex, colIndex)}
            onDoubleClick={() => onCellDoubleClick?.(rowIndex, colIndex)}
          >
            <Cell
              value={row.row[column.title!]}
              column={column}
              isEditing={isEditing}
              isActive={isActive}
              readOnly={readOnly || !!column.readonly}
              onChange={(value) => onCellChange?.(rowIndex, column.title!, value)}
            />
          </div>
        );
      })}

      {/* Empty cell for add column */}
      <div style={{ width: 50 }} />
    </div>
  );
});

export function VirtualGrid({
  rows,
  columns,
  totalRows,
  isLoading = false,
  activeCell = { row: null, col: null },
  editingCell = { row: null, col: null },
  allRowsSelected = false,
  columnWidths: externalColumnWidths = {},
  onCellClick,
  onCellDoubleClick,
  onCellChange,
  onRowSelect,
  onSelectAllRows,
  onAddRow,
  onDeleteRow,
  onDeleteSelectedRows,
  onAddColumn,
  onColumnClick,
  onColumnResize,
  onColumnResizeEnd,
  onHideColumn,
  onSortColumn,
  onDuplicateColumn,
  onDeleteColumn,
  onInsertColumnBefore,
  onInsertColumnAfter,
  onReorderColumn,
  onInsertRowAbove,
  onInsertRowBelow,
  onLoadMore,
  readOnly = false,
}: VirtualGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(externalColumnWidths);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  
  // Column drag state
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dropTargetColumnId, setDropTargetColumnId] = useState<string | null>(null);

  // Sync external column widths
  useEffect(() => {
    if (Object.keys(externalColumnWidths).length > 0) {
      setColumnWidths(externalColumnWidths);
    }
  }, [externalColumnWidths]);

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

  // Handle column resize
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

  // Handle resize move
  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX;
      const column = displayColumns.find((c) => c.id === resizingColumn);
      const newWidth = normalizeWidth(column?.uidt, resizeStartWidth + delta);
      
      setColumnWidths((prev) => ({
        ...prev,
        [resizingColumn]: newWidth,
      }));
      
      onColumnResize?.(resizingColumn, newWidth);
    };

    const handleMouseUp = () => {
      if (resizingColumn) {
        const finalWidth = columnWidths[resizingColumn] || DEFAULT_COLUMN_WIDTH;
        onColumnResizeEnd?.(resizingColumn, finalWidth);
      }
      setResizingColumn(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingColumn, resizeStartX, resizeStartWidth, displayColumns, columnWidths, onColumnResize, onColumnResizeEnd]);

  // Column drag handlers
  const handleColumnDragStart = useCallback((e: React.DragEvent, columnId: string) => {
    e.dataTransfer.setData('text/plain', columnId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedColumnId(columnId);
  }, []);

  const handleColumnDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedColumnId && draggedColumnId !== columnId) {
      setDropTargetColumnId(columnId);
    }
  }, [draggedColumnId]);

  const handleColumnDragLeave = useCallback(() => {
    setDropTargetColumnId(null);
  }, []);

  const handleColumnDrop = useCallback((e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (draggedColumnId && draggedColumnId !== targetColumnId) {
      onReorderColumn?.(draggedColumnId, targetColumnId);
    }
    setDraggedColumnId(null);
    setDropTargetColumnId(null);
  }, [draggedColumnId, onReorderColumn]);

  const handleColumnDragEnd = useCallback(() => {
    setDraggedColumnId(null);
    setDropTargetColumnId(null);
  }, []);

  // Calculate virtual scroll range
  const visibleRowCount = Math.ceil(containerHeight / ROW_HEIGHT);
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
  const endIndex = Math.min(rows.length - 1, startIndex + visibleRowCount + BUFFER_ROWS * 2);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);

    // Trigger load more if needed
    const scrollBottom = target.scrollTop + target.clientHeight;
    const threshold = target.scrollHeight - 500;
    if (scrollBottom > threshold && onLoadMore) {
      const nextChunkStart = rows.length;
      const nextChunkEnd = nextChunkStart + CHUNK_SIZE;
      if (nextChunkStart < totalRows) {
        onLoadMore(nextChunkStart, nextChunkEnd);
      }
    }
  }, [rows.length, totalRows, onLoadMore]);

  // Update container height on mount and resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (editingCell.row !== null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const { row, col } = activeCell;
      if (row === null || col === null) return;

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
        case "Delete":
        case "Backspace":
          if (!readOnly && !e.ctrlKey && !e.metaKey) {
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
      50
    );
  }, [displayColumns, getColumnWidth]);

  // Get visible rows
  const visibleRows = useMemo(() => {
    return rows.slice(startIndex, endIndex + 1).map((row, i) => ({
      row,
      index: startIndex + i,
    }));
  }, [rows, startIndex, endIndex]);

  // Calculate selected rows count
  const selectedCount = rows.filter((r) => r.rowMeta?.selected).length;

  if (isLoading && rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Selection toolbar */}
      {selectedCount > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-4 py-2.5 flex items-center gap-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-xs font-bold text-white">{selectedCount}</span>
            </div>
            <span className="text-sm font-medium text-blue-700">行已选择</span>
          </div>
          <div className="h-4 w-px bg-blue-200" />
          <button
            onClick={onDeleteSelectedRows}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            删除选中
          </button>
          <button
            onClick={() => onSelectAllRows?.(false)}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
          >
            取消选择
          </button>
        </div>
      )}

      {/* Grid container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-white scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
        onScroll={handleScroll}
        style={{ cursor: resizingColumn ? "col-resize" : undefined }}
      >
        <div style={{ minWidth: totalWidth }}>
          {/* Header Row */}
          <div
            className="flex sticky top-0 z-10 bg-gradient-to-b from-gray-50 to-gray-100 border-b border-gray-200"
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
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
              />
            </div>

            {/* Column Headers */}
            {displayColumns.map((column) => (
              <div
                key={column.id}
                className={`border-r border-gray-200 relative transition-all ${
                  dropTargetColumnId === column.id ? 'border-l-2 border-l-blue-500' : ''
                } ${draggedColumnId === column.id ? 'opacity-50' : ''}`}
                style={{
                  width: getColumnWidth(column),
                  minWidth: getColumnWidth(column),
                }}
                draggable={!readOnly && !column.pk}
                onDragStart={(e) => handleColumnDragStart(e, column.id!)}
                onDragOver={(e) => handleColumnDragOver(e, column.id!)}
                onDragLeave={handleColumnDragLeave}
                onDrop={(e) => handleColumnDrop(e, column.id!)}
                onDragEnd={handleColumnDragEnd}
              >
                <ColumnHeader
                  column={column}
                  width={getColumnWidth(column)}
                  isResizing={resizingColumn === column.id}
                  onResizeStart={(e) => handleResizeStart(e, column)}
                  onEdit={() => onColumnClick?.(column)}
                  onHide={() => onHideColumn?.(column.id!)}
                  onSortAsc={() => onSortColumn?.(column.id!, 'asc')}
                  onSortDesc={() => onSortColumn?.(column.id!, 'desc')}
                  onDuplicate={() => onDuplicateColumn?.(column.id!)}
                  onDelete={() => onDeleteColumn?.(column.id!)}
                  onInsertLeft={() => onInsertColumnBefore?.(column.id!)}
                  onInsertRight={() => onInsertColumnAfter?.(column.id!)}
                  readOnly={readOnly}
                />
              </div>
            ))}

            {/* Add Column Button */}
            {!readOnly && (
              <div
                className="flex items-center justify-center cursor-pointer hover:bg-blue-50 border-r border-gray-200 transition-colors group"
                style={{ width: 50 }}
                onClick={onAddColumn}
                title="添加字段"
              >
                <Plus className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
            )}
          </div>

          {/* Virtual Rows */}
          {rows.length > 0 ? (
            <div
              style={{
                height: rows.length * ROW_HEIGHT,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: startIndex * ROW_HEIGHT,
                  left: 0,
                  right: 0,
                }}
              >
                {visibleRows.map(({ row, index }) => (
                  <GridRow
                    key={row.rowMeta?.rowIndex ?? index}
                    row={row}
                    rowIndex={index}
                    columns={displayColumns}
                    getColumnWidth={getColumnWidth}
                    activeCell={activeCell}
                    editingCell={editingCell}
                    readOnly={readOnly}
                    onCellClick={onCellClick}
                    onCellDoubleClick={onCellDoubleClick}
                    onCellChange={onCellChange}
                    onRowSelect={onRowSelect}
                    onDeleteRow={onDeleteRow}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-400">
              暂无数据
            </div>
          )}

          {/* Add Row Button */}
          {!readOnly && (
            <div
              className="flex items-center border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer sticky left-0 transition-colors group"
              style={{ height: ROW_HEIGHT }}
              onClick={onAddRow}
            >
              <div
                className="flex items-center justify-center border-r border-gray-100 bg-gray-50/30"
                style={{ width: ROW_NUMBER_WIDTH }}
              >
                <Plus className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
              </div>
              <div className="flex-1 px-3 text-sm text-gray-400 group-hover:text-blue-600 transition-colors">
                + 点击添加新行
              </div>
            </div>
          )}

          {/* Loading more indicator */}
          {isLoading && rows.length > 0 && (
            <div className="flex items-center justify-center py-6 bg-gradient-to-t from-blue-50/50 to-transparent">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              <span className="ml-2 text-sm font-medium text-gray-500">加载数据中...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { ROW_HEIGHT, HEADER_HEIGHT, ROW_NUMBER_WIDTH, DEFAULT_COLUMN_WIDTH, CHUNK_SIZE };
