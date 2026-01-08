"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Grid3X3,
  Calendar,
  Loader2,
  ArrowLeft,
  Kanban,
  FormInput,
  Map,
  GalleryHorizontalEnd,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Maximize2,
  Minimize2,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/app/components/ui";
import { useViews } from "@/app/composables/useViews";
import { useTableData } from "@/app/composables/useTableData";
import { useViewColumns } from "@/app/composables/useViewColumns";
import { useViewSorts } from "@/app/composables/useViewSorts";
import { useViewFilters } from "@/app/composables/useViewFilters";
import { ViewOptionsMenu } from "@/components/workspace/menus/ViewOptionsMenu";
import { VirtualGrid, ColumnEditor, Pagination, FormView } from "@/app/components/smartsheet";
import { GridToolbar, FormToolbar } from "@/app/components/smartsheet/toolbar";
import { AutomationButton } from "@/app/components/automation";
import type { SortType } from "nocodb-sdk";
import type { ColumnType } from "nocodb-sdk";
import { ViewTypes } from "nocodb-sdk";

// Get icon for view type
const getViewIcon = (type: number | undefined) => {
  switch (type) {
    case ViewTypes.GRID:
      return Grid3X3;
    case ViewTypes.GALLERY:
      return GalleryHorizontalEnd;
    case ViewTypes.KANBAN:
      return Kanban;
    case ViewTypes.FORM:
      return FormInput;
    case ViewTypes.CALENDAR:
      return Calendar;
    case ViewTypes.MAP:
      return Map;
    default:
      return Grid3X3;
  }
};

export default function TablePage({
  params,
}: {
  params: Promise<{ baseId: string; tableId: string }>;
}) {
  const { baseId, tableId } = use(params);
  
  // Views management
  const { 
    viewsByTable, 
    loadViews, 
    isViewsLoading, 
    createView, 
    renameView, 
    deleteView, 
    duplicateView 
  } = useViews();
  
  // Table data management
  const {
    rows,
    columns,
    displayColumns,
    tableMeta,
    paginationData,
    isLoading,
    activeCell,
    editingCell,
    allRowsSelected,
    loadTableMeta,
    loadData,
    reloadData,
    changePage,
    changePageSize,
    addEmptyRow,
    insertRow,
    updateCell,
    deleteRow,
    deleteSelectedRows,
    selectRow,
    selectAllRows,
    setActiveCell,
    setEditingCell,
    addColumn,
    updateColumn,
    deleteColumn,
    setViewId,
  } = useTableData({ tableId, baseId, pageSize: 25 });

  // Get views for current table (must be before activeViewId state)
  const views = viewsByTable.get(tableId) || [];

  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [showAddViewMenu, setShowAddViewMenu] = useState(false);
  
  // Toolbar state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState<string | null>(null);

  // Form preview mode
  const [isFormPreviewMode, setIsFormPreviewMode] = useState(false);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build search where clause
  const buildSearchWhere = useCallback((query: string, fieldId: string | null): string => {
    if (!query.trim()) return "";
    
    const column = fieldId 
      ? columns.find(c => c.id === fieldId)
      : columns.find(c => c.pv) || columns[0];
    
    if (!column) return "";
    
    // Use 'like' for text columns, 'eq' for others
    const isTextColumn = ['SingleLineText', 'LongText', 'Email', 'URL', 'PhoneNumber'].includes(column.uidt as string);
    const op = isTextColumn ? 'like' : 'eq';
    const value = isTextColumn ? `%${query}%` : query;
    
    return `(${column.id},${op},${value})`;
  }, [columns]);

  // Debounce timer ref
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Handle search change with debounce
  const handleSearchChange = useCallback((query: string, field: string | null) => {
    setSearchQuery(query);
    setSearchField(field);
    
    // Clear previous debounce
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    
    // Debounce the search
    searchDebounceRef.current = setTimeout(() => {
      const where = buildSearchWhere(query, field);
      loadData({ where, offset: 0 });
    }, 500);
  }, [buildSearchWhere, loadData]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Listen for fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  // Column editor state
  const [columnEditorOpen, setColumnEditorOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<ColumnType | null>(null);
  const [insertColumnPosition, setInsertColumnPosition] = useState<{ columnId: string; position: 'before' | 'after' } | null>(null);

  // Insert column before handler
  const handleInsertColumnBefore = useCallback((columnId: string) => {
    setInsertColumnPosition({ columnId, position: 'before' });
    setEditingColumn(null);
    setColumnEditorOpen(true);
  }, []);

  // Insert column after handler
  const handleInsertColumnAfter = useCallback((columnId: string) => {
    setInsertColumnPosition({ columnId, position: 'after' });
    setEditingColumn(null);
    setColumnEditorOpen(true);
  }, []);

  // Delete column handler
  const handleDeleteColumn = useCallback(async (columnId: string) => {
    if (!confirm('确定要删除此字段吗？此操作不可撤销。')) return;
    try {
      await deleteColumn(columnId);
    } catch (e) {
      console.error('Failed to delete column:', e);
    }
  }, [deleteColumn]);

  // Duplicate column handler
  const handleDuplicateColumn = useCallback(async (columnId: string) => {
    const column = columns.find(c => c.id === columnId);
    if (!column) return;
    
    try {
      const newTitle = `${column.title} 副本`;
      await addColumn({
        ...column,
        id: undefined,
        title: newTitle,
        column_name: newTitle.replace(/\s/g, '_'),
      } as any);
    } catch (e) {
      console.error('Failed to duplicate column:', e);
    }
  }, [columns, addColumn]);

  // Active view
  const activeView = views.find(v => v.id === activeViewId) || views.find(v => v.is_default) || views[0];
  const currentViewId = activeViewId || activeView?.id;

  // View columns management (column width, visibility, order via API)
  const { 
    gridViewCols,
    getColumnWidth,
    updateColumnWidth,
    hideColumn,
    loadViewColumns,
    sortedColumns,
    reorderColumn,
    getInsertPosition,
  } = useViewColumns({ 
    viewId: currentViewId, 
    tableId, 
    columns: displayColumns 
  });

  // View sorts management (API-backed)
  const {
    sorts,
    insertSort,
    addSort,
    deleteSort,
    updateSort,
  } = useViewSorts({
    viewId: currentViewId,
    onReloadData: loadData,
  });

  // View filters management (API-backed)
  const {
    filters,
    addFilter,
    deleteFilter,
    updateFilter,
  } = useViewFilters({
    viewId: currentViewId,
    onReloadData: loadData,
  });

  // Load table data and views on mount
  useEffect(() => {
    loadTableMeta();
    loadData();
    loadViews(tableId);
  }, [tableId, loadTableMeta, loadData, loadViews]);

  // Set active view to default when views are loaded
  useEffect(() => {
    if (views.length > 0 && !activeViewId) {
      const defaultView = views.find(v => v.is_default) || views[0];
      if (defaultView?.id) {
        setActiveViewId(defaultView.id);
      }
    }
  }, [views, activeViewId]);

  // Sync viewId with useTableData when view changes
  useEffect(() => {
    if (currentViewId) {
      setViewId(currentViewId);
    }
  }, [currentViewId, setViewId]);

  // Handle creating a new view
  const handleCreateView = async (type: "grid" | "gallery" | "form" | "kanban" | "calendar") => {
    const title = prompt("输入视图名称", `新${type === 'grid' ? '网格' : type === 'gallery' ? '画廊' : type === 'form' ? '表单' : type === 'kanban' ? '看板' : '日历'}视图`);
    if (title) {
      const newView = await createView(tableId, { title, type });
      if (newView?.id) {
        setActiveViewId(newView.id);
      }
    }
    setShowAddViewMenu(false);
  };

  // Handle add row
  const handleAddRow = useCallback(async () => {
    const newRow = addEmptyRow();
    try {
      await insertRow(newRow);
    } catch (e) {
      console.error("Failed to insert row:", e);
    }
  }, [addEmptyRow, insertRow]);

  // Handle cell change
  const handleCellChange = useCallback((rowIndex: number, columnTitle: string, value: any) => {
    updateCell(rowIndex, columnTitle, value);
  }, [updateCell]);

  // Handle cell click
  const handleCellClick = useCallback((rowIndex: number, colIndex: number) => {
    setActiveCell(rowIndex, colIndex);
  }, [setActiveCell]);

  // Handle cell double click (start editing)
  const handleCellDoubleClick = useCallback((rowIndex: number, colIndex: number) => {
    setEditingCell(rowIndex, colIndex);
  }, [setEditingCell]);

  if (isLoading && rows.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`h-full flex flex-col ${isFullscreen ? 'bg-white' : ''}`}>
      {/* Table Header - Breadcrumb Style */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <nav className="flex items-center gap-2 text-sm">
            {!isFullscreen && (
              <>
                <Link 
                  href={`/workspace/${baseId}`}
                  className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>返回</span>
                </Link>
                <span className="text-gray-300">/</span>
              </>
            )}
            <span className="font-medium text-gray-900">
              {tableMeta?.title || "表格"}
            </span>
            {activeView && !activeView.is_default && (
              <>
                <span className="text-gray-300">/</span>
                <span className="text-gray-600">{activeView.title}</span>
              </>
            )}
          </nav>
          
          {/* Automation Button */}
          <AutomationButton 
            baseId={baseId} 
            tableId={tableId} 
            variant="compact"
          />
          
          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={isFullscreen ? "退出全屏" : "全屏模式"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-gray-500" />
            ) : (
              <Maximize2 className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>
      </div>

      {/* View-specific Toolbar */}
      {activeView?.type === ViewTypes.FORM ? (
        <FormToolbar
          viewId={currentViewId}
          tableId={tableId}
          tableName={tableMeta?.title}
          viewUuid={(activeView as any)?.uuid}
          viewPassword={(activeView as any)?.password}
          readOnly={false}
          isPreviewMode={isFormPreviewMode}
          onPreviewToggle={() => setIsFormPreviewMode(!isFormPreviewMode)}
          onShareChange={() => {
            // Reload views to update uuid after share status changes
            loadViews(tableId, true);
          }}
        />
      ) : (
        <GridToolbar
          columns={columns}
          filters={filters}
          sorts={sorts}
          searchQuery={searchQuery}
          searchField={searchField}
          onAddFilter={addFilter}
          onUpdateFilter={updateFilter}
          onDeleteFilter={deleteFilter}
          onAddSort={addSort}
          onUpdateSort={updateSort}
          onDeleteSort={deleteSort}
          onSearchChange={handleSearchChange}
        />
      )}

      {/* View Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center gap-1">
          {isViewsLoading && views.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-1.5 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>加载视图...</span>
            </div>
          ) : views.length === 0 ? (
            <div className="px-3 py-1.5 text-gray-400 text-sm">暂无视图</div>
          ) : (
            views.map((view) => {
              const ViewIcon = getViewIcon(view.type);
              const isActive = view.id === activeViewId || (activeViewId === null && view.is_default);
              return (
                <div key={view.id} className="flex items-center group">
                  <button
                    onClick={() => setActiveViewId(view.id!)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <ViewIcon className="w-4 h-4" />
                    {view.is_default ? tableMeta?.title : view.title}
                  </button>
                  {!view.is_default && (
                    <ViewOptionsMenu
                      view={view}
                      onRename={() => {
                        const newTitle = prompt("输入新名称", view.title || "");
                        if (newTitle && newTitle !== view.title && view.id) {
                          renameView(view.id, newTitle);
                        }
                      }}
                      onDuplicate={() => duplicateView(view)}
                      onDelete={() => {
                        if (confirm(`确定要删除视图 "${view.title}" 吗？`)) {
                          deleteView(view);
                          // Switch to default view after deletion
                          const defaultView = views.find(v => v.is_default);
                          if (defaultView?.id) setActiveViewId(defaultView.id);
                        }
                      }}
                      onEditDescription={() => alert("编辑描述功能开发中...")}
                      onCopyId={() => navigator.clipboard.writeText(view.id || "")}
                    >
                      <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded -ml-1">
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                      </button>
                    </ViewOptionsMenu>
                  )}
                </div>
              );
            })
          )}
          
          {/* Add View Button */}
          <div className="relative">
            <button 
              onClick={() => setShowAddViewMenu(!showAddViewMenu)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            >
              <Plus className="w-4 h-4" />
            </button>
            
            {showAddViewMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[160px]">
                <button
                  onClick={() => handleCreateView("grid")}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Grid3X3 className="w-4 h-4" />
                  网格视图
                </button>
                <button
                  onClick={() => handleCreateView("gallery")}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <GalleryHorizontalEnd className="w-4 h-4" />
                  画廊视图
                </button>
                <button
                  onClick={() => handleCreateView("form")}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <FormInput className="w-4 h-4" />
                  表单视图
                </button>
                <button
                  onClick={() => handleCreateView("kanban")}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Kanban className="w-4 h-4" />
                  看板视图
                </button>
                <button
                  onClick={() => handleCreateView("calendar")}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Calendar className="w-4 h-4" />
                  日历视图
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-hidden">
        {activeView?.type === ViewTypes.GRID && (
          <VirtualGrid 
            rows={rows}
            columns={sortedColumns.length > 0 ? sortedColumns : displayColumns}
            totalRows={paginationData.totalRows || rows.length}
            isLoading={isLoading}
            activeCell={activeCell}
            editingCell={editingCell}
            allRowsSelected={allRowsSelected}
            columnWidths={Object.fromEntries(
              Object.entries(gridViewCols).map(([id, col]) => [id, parseInt(col.width?.replace('px', '') || '180', 10)])
            )}
            onCellClick={handleCellClick}
            onCellDoubleClick={handleCellDoubleClick}
            onCellChange={handleCellChange}
            onRowSelect={selectRow}
            onSelectAllRows={selectAllRows}
            onAddRow={handleAddRow}
            onDeleteRow={deleteRow}
            onDeleteSelectedRows={deleteSelectedRows}
            onAddColumn={() => {
              setEditingColumn(null);
              setColumnEditorOpen(true);
            }}
            onColumnClick={(column: ColumnType) => {
              setEditingColumn(column);
              setColumnEditorOpen(true);
            }}
            onColumnResizeEnd={(columnId, width) => {
              updateColumnWidth(columnId, width);
            }}
            onHideColumn={hideColumn}
            onSortColumn={(columnId, direction) => {
              console.log('page.tsx onSortColumn', columnId, direction);
              const column = columns.find(c => c.id === columnId);
              if (column) {
                insertSort(column, direction);
              }
            }}
            onDeleteColumn={handleDeleteColumn}
            onDuplicateColumn={handleDuplicateColumn}
            onInsertColumnBefore={handleInsertColumnBefore}
            onInsertColumnAfter={handleInsertColumnAfter}
            onReorderColumn={reorderColumn}
          />
        )}
        {activeView?.type === ViewTypes.GALLERY && <GalleryView />}
        {activeView?.type === ViewTypes.FORM && (
          <FormView
            viewId={currentViewId}
            baseId={baseId}
            tableId={tableId}
            columns={columns}
            tableName={tableMeta?.title}
            isEditable={!isFormPreviewMode}
          />
        )}
        {activeView?.type === ViewTypes.KANBAN && <KanbanView />}
        {activeView?.type === ViewTypes.CALENDAR && <CalendarView />}
        {!activeView && views.length === 0 && (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <Grid3X3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>暂无视图，点击上方 + 创建</p>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {paginationData.totalRows !== undefined && (
        <Pagination
          currentPage={paginationData.page}
          pageSize={paginationData.pageSize}
          totalRows={paginationData.totalRows}
          isLoading={isLoading}
          onPageChange={changePage}
          onPageSizeChange={changePageSize}
          onRefresh={reloadData}
        />
      )}

      {/* Column Editor Dialog */}
      <ColumnEditor
        open={columnEditorOpen}
        onOpenChange={(open) => {
          setColumnEditorOpen(open);
          if (!open) {
            setInsertColumnPosition(null);
          }
        }}
        column={editingColumn}
        columnPosition={insertColumnPosition ? getInsertPosition(insertColumnPosition.columnId, insertColumnPosition.position) : undefined}
        onSave={async (data, columnPosition) => {
          if (editingColumn?.id) {
            await updateColumn(editingColumn.id, data);
          } else {
            // Pass column_order for insert position
            await addColumn({ ...data, ...(columnPosition || {}) } as any);
          }
          setInsertColumnPosition(null);
          await loadTableMeta();
          // Reload view columns to get updated order information
          await loadViewColumns();
        }}
        onDelete={editingColumn?.id ? async () => {
          if (confirm(`确定要删除字段 "${editingColumn.title}" 吗？`)) {
            await deleteColumn(editingColumn.id!);
            setColumnEditorOpen(false);
            await loadTableMeta();
          }
        } : undefined}
      />
    </div>
  );
}


function GalleryView() {
  return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <div className="text-center">
        <GalleryHorizontalEnd className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>画廊视图</p>
        <p className="text-sm text-gray-400 mt-2">此视图类型开发中...</p>
      </div>
    </div>
  );
}


function KanbanView() {
  return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <div className="text-center">
        <Kanban className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>看板视图</p>
        <p className="text-sm text-gray-400 mt-2">此视图类型开发中...</p>
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
        <p className="text-sm text-gray-400 mt-2">此视图类型开发中...</p>
      </div>
    </div>
  );
}
