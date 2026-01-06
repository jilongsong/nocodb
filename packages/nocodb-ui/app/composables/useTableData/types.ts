import type { ColumnType, TableType, ViewType, PaginatedType } from "nocodb-sdk";

// Row data structure matching nc-gui
export interface Row {
  row: Record<string, any>;
  oldRow: Record<string, any>;
  rowMeta: {
    new?: boolean;
    selected?: boolean;
    saving?: boolean;
    changed?: boolean;
    commentCount?: number;
    rowIndex?: number;
  };
}

// Pagination data
export interface PaginationData {
  page: number;
  pageSize: number;
  totalRows?: number;
  isFirstPage?: boolean;
  isLastPage?: boolean;
}

// Cell range for selection
export interface CellRange {
  start: { row: number; col: number };
  end: { row: number; col: number };
}

// Active cell position
export interface ActiveCell {
  row: number | null;
  col: number | null;
}

// Table data state
export interface TableDataState {
  rows: Row[];
  columns: ColumnType[];
  paginationData: PaginationData;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  activeCell: ActiveCell;
  selectedRows: Set<string>;
  editingCell: ActiveCell;
}

// Table data actions
export interface TableDataActions {
  // Data loading
  loadData: (params?: LoadDataParams) => Promise<void>;
  reloadData: () => Promise<void>;
  changePage: (page: number) => Promise<void>;
  changePageSize: (pageSize: number) => Promise<void>;
  
  // Row operations
  addEmptyRow: (index?: number) => Row;
  insertRow: (row: Row) => Promise<any>;
  updateRow: (row: Row, property: string) => Promise<any>;
  deleteRow: (rowIndex: number) => Promise<void>;
  deleteRowById: (id: string) => Promise<void>;
  deleteSelectedRows: () => Promise<void>;
  
  // Cell operations
  updateCell: (rowIndex: number, columnId: string, value: any) => Promise<void>;
  clearCell: (rowIndex: number, columnId: string) => Promise<void>;
  
  // Selection
  selectRow: (rowIndex: number, selected: boolean) => void;
  selectAllRows: (selected: boolean) => void;
  setActiveCell: (row: number | null, col: number | null) => void;
  setEditingCell: (row: number | null, col: number | null) => void;
  
  // Column operations
  addColumn: (column: Partial<ColumnType>, position?: number) => Promise<ColumnType | undefined>;
  updateColumn: (columnId: string, data: Partial<ColumnType>) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  reorderColumn: (columnId: string, newOrder: number) => Promise<void>;
}

// Load data parameters
export interface LoadDataParams {
  offset?: number;
  limit?: number;
  where?: string;
  sort?: string;
  fields?: string[];
}

// useTableData options
export interface UseTableDataOptions {
  tableId: string;
  viewId?: string;
  baseId: string;
  pageSize?: number;
}
