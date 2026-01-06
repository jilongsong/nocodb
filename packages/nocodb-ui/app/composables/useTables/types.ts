import type { TableType } from 'nocodb-sdk'

/**
 * 扩展的 Table 类型
 */
export interface NcTable extends TableType {
  isLoading?: boolean
}

/**
 * useTables 状态
 */
export interface TablesState {
  baseTables: Map<string, NcTable[]>
  isTablesLoading: boolean
}

/**
 * useTables Getters
 */
export interface TablesGetters {
  activeTableId: string | undefined
  activeTables: NcTable[]
  activeTable: NcTable | undefined
}

/**
 * useTables Actions
 */
export interface TablesActions {
  loadProjectTables: (baseId: string, force?: boolean) => Promise<void>
  addTable: (baseId: string, table: TableType) => void
  updateTable: (table: TableType) => Promise<void>
  deleteTable: (baseId: string, tableId: string) => Promise<void>
  createTable: (baseId: string, sourceId: string, title: string) => Promise<TableType | undefined>
  navigateToTable: (params: { baseId?: string; tableId: string; viewTitle?: string }) => void
  openTable: (table: TableType, replace?: boolean) => Promise<void>
  getTableMeta: (tableId: string) => Promise<TableType | null>
  clearTables: () => void
}

/**
 * useTables 返回类型
 */
export interface UseTablesReturn extends TablesState, TablesGetters, TablesActions {}
