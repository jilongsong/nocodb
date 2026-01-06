"use client"

import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type { TableType } from 'nocodb-sdk'
import type { 
  NcTable, 
  TablesState, 
  UseTablesReturn 
} from './types'
import { getGlobalApi, extractSdkResponseErrorMsg } from '../useApi'
import { useBases } from '../useBases'

/**
 * 获取初始状态
 */
function getInitialState(): TablesState {
  return {
    baseTables: new Map(),
    isTablesLoading: false,
  }
}

/**
 * Tables Context
 */
const TablesContext = createContext<UseTablesReturn | null>(null)

/**
 * Tables Provider
 */
export function TablesProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const params = useParams()
  
  const api = useMemo(() => getGlobalApi(), [])
  const { activeProjectId, openedProjectBasesMap } = useBases()

  // State
  const [state, setState] = useState<TablesState>(getInitialState)

  // 更新状态的辅助方法
  const updateState = useCallback((updates: Partial<TablesState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  // Computed: activeTableId
  const activeTableId = useMemo(() => {
    return params?.tableId as string | undefined
  }, [params?.tableId])

  // Computed: activeTables
  const activeTables = useMemo(() => {
    if (!activeProjectId) return []
    
    const tables = state.baseTables.get(activeProjectId)
    if (!tables) return []

    // 过滤掉禁用的 source
    return tables.filter((t) => {
      if (!t.source_id) return true
      const source = openedProjectBasesMap.get(t.source_id)
      return source?.enabled !== false
    })
  }, [activeProjectId, state.baseTables, openedProjectBasesMap])

  // Computed: activeTable
  const activeTable = useMemo(() => {
    if (!activeTableId) return undefined
    return activeTables.find((t) => t.id === activeTableId)
  }, [activeTableId, activeTables])

  // Actions
  const loadProjectTables = useCallback(async (baseId: string, force = false) => {
    if (!force && state.baseTables.has(baseId)) {
      return
    }

    updateState({ isTablesLoading: true })

    try {
      const response = await api.dbTable.list(baseId, {
        includeM2M: false,
      })

      const tables: NcTable[] = (response.list || []).map((t) => {
        let meta = t.meta
        if (typeof meta === 'string') {
          try {
            meta = JSON.parse(meta)
          } catch {
            meta = {}
          }
        }
        return { ...t, meta: meta || {} }
      })

      const newBaseTables = new Map(state.baseTables)
      newBaseTables.set(baseId, tables)
      updateState({ baseTables: newBaseTables })
    } catch (e: any) {
      const msg = await extractSdkResponseErrorMsg(e)
      console.error('Failed to load tables:', msg)
    } finally {
      updateState({ isTablesLoading: false })
    }
  }, [api, state.baseTables, updateState])

  const addTable = useCallback((baseId: string, table: TableType) => {
    const tables = state.baseTables.get(baseId)
    if (!tables) return

    const newBaseTables = new Map(state.baseTables)
    newBaseTables.set(baseId, [...tables, table as NcTable])
    updateState({ baseTables: newBaseTables })
  }, [state.baseTables, updateState])

  const updateTable = useCallback(async (table: TableType) => {
    if (!table.id || !table.base_id) return

    try {
      await api.dbTable.update(table.id, {
        base_id: table.base_id,
        table_name: table.table_name,
        title: table.title,
      })

      await loadProjectTables(table.base_id, true)
    } catch (e: any) {
      const msg = await extractSdkResponseErrorMsg(e)
      console.error('Failed to update table:', msg)
    }
  }, [api, loadProjectTables])

  const deleteTable = useCallback(async (baseId: string, tableId: string) => {
    try {
      await api.dbTable.delete(tableId)

      const tables = state.baseTables.get(baseId)
      if (tables) {
        const newBaseTables = new Map(state.baseTables)
        newBaseTables.set(baseId, tables.filter((t) => t.id !== tableId))
        updateState({ baseTables: newBaseTables })
      }
    } catch (e: any) {
      const msg = await extractSdkResponseErrorMsg(e)
      console.error('Failed to delete table:', msg)
    }
  }, [api, state.baseTables, updateState])

  const createTable = useCallback(async (baseId: string, sourceId: string, title: string) => {
    try {
      const result = await api.source.tableCreate(baseId, sourceId, {
        title,
        table_name: title,
        columns: [],
      } as any)

      if (result) {
        addTable(baseId, result)
      }

      return result
    } catch (e: any) {
      const msg = await extractSdkResponseErrorMsg(e)
      console.error('Failed to create table:', msg)
      return undefined
    }
  }, [api, addTable])

  const navigateToTable = useCallback(({ baseId, tableId, viewTitle }: { baseId?: string; tableId: string; viewTitle?: string }) => {
    const finalBaseId = baseId || activeProjectId
    if (!finalBaseId) return

    let path = `/workspace/${finalBaseId}/table/${tableId}`
    if (viewTitle) {
      path += `/${viewTitle}`
    }
    router.push(path)
  }, [router, activeProjectId])

  const openTable = useCallback(async (table: TableType, replace = false) => {
    if (!table.base_id || !table.id) return

    const path = `/workspace/${table.base_id}/table/${table.id}`
    if (replace) {
      router.replace(path)
    } else {
      router.push(path)
    }
  }, [router])

  const getTableMeta = useCallback(async (tableId: string): Promise<TableType | null> => {
    try {
      const meta = await api.dbTable.read(tableId)
      return meta
    } catch {
      return null
    }
  }, [api])

  const clearTables = useCallback(() => {
    updateState({ baseTables: new Map() })
  }, [updateState])

  // 组合返回值
  const value = useMemo<UseTablesReturn>(() => ({
    // State
    ...state,
    // Getters
    activeTableId,
    activeTables,
    activeTable,
    // Actions
    loadProjectTables,
    addTable,
    updateTable,
    deleteTable,
    createTable,
    navigateToTable,
    openTable,
    getTableMeta,
    clearTables,
  }), [
    state,
    activeTableId,
    activeTables,
    activeTable,
    loadProjectTables,
    addTable,
    updateTable,
    deleteTable,
    createTable,
    navigateToTable,
    openTable,
    getTableMeta,
    clearTables,
  ])

  return (
    <TablesContext.Provider value={value}>
      {children}
    </TablesContext.Provider>
  )
}

/**
 * useTables hook
 * 
 * @example
 * ```tsx
 * const { 
 *   activeTables, 
 *   loadProjectTables,
 *   createTable,
 *   navigateToTable 
 * } = useTables()
 * ```
 */
export function useTables(): UseTablesReturn {
  const context = useContext(TablesContext)
  if (!context) {
    throw new Error('useTables must be used within a TablesProvider')
  }
  return context
}

// 导出类型
export type { NcTable, UseTablesReturn } from './types'
