"use client"

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type { BaseType, SourceType } from 'nocodb-sdk'
import type { 
  NcProject, 
  User,
  BasesState, 
  UseBasesReturn 
} from './types'
import { getGlobalApi, extractSdkResponseErrorMsg } from '../useApi'

/**
 * 获取初始状态
 */
function getInitialState(): BasesState {
  return {
    bases: new Map(),
    basesUser: new Map(),
    baseRoles: {},
    isProjectsLoading: false,
    isProjectsLoaded: false,
    showProjectList: true,
    baseHomeSearchQuery: '',
  }
}

/**
 * Bases Context
 */
const BasesContext = createContext<UseBasesReturn | null>(null)

/**
 * Bases Provider
 */
export function BasesProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const params = useParams()
  
  const api = useMemo(() => getGlobalApi(), [])

  // State
  const [state, setState] = useState<BasesState>(getInitialState)
  
  // 使用 ref 来访问最新状态，避免 useCallback 依赖导致的循环
  const stateRef = React.useRef(state)
  stateRef.current = state

  // 更新状态的辅助方法
  const updateState = useCallback((updates: Partial<BasesState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  // Computed: basesList
  const basesList = useMemo(() => {
    return Array.from(state.bases.values()).sort(
      (a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)
    )
  }, [state.bases])

  // Computed: activeProjectId
  const activeProjectId = useMemo(() => {
    const baseId = params?.baseId as string | undefined
    if (params?.typeOrId === 'base') {
      return basesList[0]?.id
    }
    return baseId
  }, [params, basesList])

  // Computed: openedProject
  const openedProject = useMemo(() => {
    return activeProjectId ? state.bases.get(activeProjectId) : undefined
  }, [activeProjectId, state.bases])

  // Computed: openedProjectBasesMap
  const openedProjectBasesMap = useMemo(() => {
    const basesMap = new Map<string, SourceType>()
    if (!openedProject?.sources) return basesMap
    for (const source of openedProject.sources) {
      if (source.id) {
        basesMap.set(source.id, source)
      }
    }
    return basesMap
  }, [openedProject])

  // Computed: isDataSourceLimitReached
  const isDataSourceLimitReached = useMemo(() => {
    return Number(openedProject?.sources?.length) > 9
  }, [openedProject])

  // Actions
  const loadProjects = useCallback(async (page: 'recent' | 'shared' | 'starred' | 'workspace' = 'recent') => {
    // 避免重复加载
    if (stateRef.current.isProjectsLoading) return
    // 如果已经加载过，不再重复加载（除非强制刷新）
    if (stateRef.current.isProjectsLoaded) return
    
    updateState({ isProjectsLoading: true })
    
    try {
      const { list } = await api.base.list()

      console.log('loadProjects', list)
      
      const currentBases = stateRef.current.bases
      const newBases = new Map<string, NcProject>()
      for (const base of list || []) {
        const existingBase = currentBases.get(base.id!) || {}
        newBases.set(base.id!, {
          ...existingBase,
          ...base,
          isExpanded: params?.baseId === base.id || currentBases.get(base.id!)?.isExpanded,
          isLoading: false,
        })
      }
      
      updateState({ bases: newBases, isProjectsLoading: false, isProjectsLoaded: true })
      return list
    } catch (e: any) {
      // 401 错误不打印详细日志，避免刷屏
      if (e?.response?.status !== 401) {
        console.error(e)
        const msg = await extractSdkResponseErrorMsg(e)
        console.error(msg)
      }
      // 标记为已加载，避免无限重试
      updateState({ isProjectsLoading: false, isProjectsLoaded: true })
    }
  }, [api, params?.baseId, updateState])

  const loadProject = useCallback(async (baseId: string, force = false) => {
    try {
      const currentBases = stateRef.current.bases
      const existingBase = currentBases.get(baseId)
      if (!force && existingBase?.sources?.length) {
        return existingBase
      }

      const project = await api.base.read(baseId)
      if (!project) {
        router.push('/')
        return
      }

      const meta = project.meta && typeof project.meta === 'string' 
        ? JSON.parse(project.meta) 
        : project.meta || {}

      const base: NcProject = {
        ...(existingBase || {}),
        ...project,
        meta,
        isExpanded: params?.baseId === baseId || existingBase?.isExpanded,
        isLoading: false,
      }

      const newBases = new Map(currentBases)
      newBases.set(baseId, base)
      updateState({ bases: newBases })

      return base
    } catch (e: any) {
      const msg = await extractSdkResponseErrorMsg(e)
      console.error(msg)
    }
  }, [api, params?.baseId, router, updateState])

  const createProject = useCallback(async (payload: { 
    title: string
    workspaceId?: string
    linkedDbProjectIds?: string[]
    meta?: Record<string, unknown>
  }) => {
    try {
      const result = await api.base.create({
        title: payload.title,
        linked_db_project_ids: payload.linkedDbProjectIds,
        meta: JSON.stringify(payload.meta || {}),
      })
      
      await loadProjects()
      return result
    } catch (e: any) {
      const msg = await extractSdkResponseErrorMsg(e)
      console.error(msg)
    }
  }, [api, loadProjects])

  const updateProject = useCallback(async (baseId: string, payload: Partial<BaseType>) => {
    try {
      const currentBases = stateRef.current.bases
      const existingBase = currentBases.get(baseId) || {}
      const newBases = new Map(currentBases)
      newBases.set(baseId, { ...existingBase, ...payload } as NcProject)
      updateState({ bases: newBases })

      await api.base.update(baseId, payload)
      await loadProject(baseId, true)
    } catch (e: any) {
      const msg = await extractSdkResponseErrorMsg(e)
      console.error(msg)
    }
  }, [api, loadProject, updateState])

  const deleteProject = useCallback(async (baseId: string) => {
    try {
      await api.base.delete(baseId)
      
      const newBases = new Map(stateRef.current.bases)
      newBases.delete(baseId)
      updateState({ bases: newBases })

      await loadProjects()
    } catch (e: any) {
      const msg = await extractSdkResponseErrorMsg(e)
      console.error(msg)
    }
  }, [api, loadProjects, updateState])

  const getProjectMeta = useCallback((baseId: string) => {
    const base = stateRef.current.bases.get(baseId)
    if (!base) throw new Error('Base not found')

    let meta = { showNullAndEmptyInFilter: false }
    try {
      meta = typeof base.meta === 'string' ? JSON.parse(base.meta) : (base.meta as any) || meta
    } catch {}

    return meta
  }, [])

  const getProjectMetaInfo = useCallback(async (baseId: string) => {
    return await api.base.metaGet(baseId, {})
  }, [api])

  const setProject = useCallback((baseId: string, base: NcProject) => {
    const newBases = new Map(stateRef.current.bases)
    newBases.set(baseId, base)
    updateState({ bases: newBases })
  }, [updateState])

  const clearBases = useCallback(() => {
    updateState({ bases: new Map(), isProjectsLoaded: false })
  }, [updateState])

  const isProjectEmpty = useCallback((baseId: string) => {
    const base = stateRef.current.bases.get(baseId)
    if (!base) return true
    return !base.sources?.length
  }, [])

  const isProjectPopulated = useCallback((baseId: string) => {
    const base = stateRef.current.bases.get(baseId)
    if (!base) return false
    return !!(base.sources?.length)
  }, [])

  const navigateToProject = useCallback(async ({ baseId, page, query }: { baseId: string; page?: 'collaborators'; query?: any }) => {
    if (!baseId) return

    const searchParams = new URLSearchParams()
    if (page) searchParams.set('page', page)
    if (query) {
      Object.entries(query).forEach(([k, v]) => searchParams.set(k, String(v)))
    }

    const search = searchParams.toString()
    router.push(`/workspace/${baseId}${search ? `?${search}` : ''}`)
  }, [router])

  const navigateToFirstProjectOrHome = useCallback(async () => {
    if (basesList.length) {
      await navigateToProject({ baseId: basesList[0].id! })
    } else {
      router.push('/')
    }
  }, [basesList, navigateToProject, router])

  const getBaseUsers = useCallback(async ({ baseId, searchText, force = false }: { baseId: string; searchText?: string; force?: boolean }) => {
    if (!baseId) return { users: [], totalRows: 0 }

    const currentBasesUser = stateRef.current.basesUser
    if (!force && currentBasesUser.has(baseId)) {
      const users = currentBasesUser.get(baseId) || []
      return { users, totalRows: users.length }
    }

    try {
      const response: any = await api.auth.baseUserList(baseId, {} as any)

      const users = response.users?.list || []
      const totalRows = response.users?.pageInfo?.totalRows || 0

      const newBasesUser = new Map(stateRef.current.basesUser)
      newBasesUser.set(baseId, users)
      updateState({ basesUser: newBasesUser })

      return { users, totalRows }
    } catch (e: any) {
      console.error(e)
      return { users: [], totalRows: 0 }
    }
  }, [api, updateState])

  const createProjectUser = useCallback(async (baseId: string, user: User) => {
    await api.auth.baseUserAdd(baseId, user as any)
  }, [api])

  const updateProjectUser = useCallback(async (baseId: string, user: User) => {
    await api.auth.baseUserUpdate(baseId, user.id, user as any)
  }, [api])

  const removeProjectUser = useCallback(async (baseId: string, user: User) => {
    await api.auth.baseUserRemove(baseId, user.id)
  }, [api])

  const clearBasesUser = useCallback(() => {
    updateState({ basesUser: new Map() })
  }, [updateState])

  const toggleStarred = useCallback(async (_baseId: string) => {
    // 待实现
  }, [])

  const getBaseRoles = useCallback(async (_baseId: string) => {
    // 待实现
  }, [])

  // 组合返回值
  const value = useMemo<UseBasesReturn>(() => ({
    // State
    ...state,
    // Getters
    basesList,
    activeProjectId,
    openedProject,
    openedProjectBasesMap,
    isDataSourceLimitReached,
    // Actions
    loadProjects,
    loadProject,
    createProject,
    updateProject,
    deleteProject,
    getProjectMeta,
    getProjectMetaInfo,
    setProject,
    clearBases,
    isProjectEmpty,
    isProjectPopulated,
    navigateToProject,
    navigateToFirstProjectOrHome,
    getBaseUsers,
    createProjectUser,
    updateProjectUser,
    removeProjectUser,
    clearBasesUser,
    toggleStarred,
    getBaseRoles,
  }), [
    state,
    basesList,
    activeProjectId,
    openedProject,
    openedProjectBasesMap,
    isDataSourceLimitReached,
    loadProjects,
    loadProject,
    createProject,
    updateProject,
    deleteProject,
    getProjectMeta,
    getProjectMetaInfo,
    setProject,
    clearBases,
    isProjectEmpty,
    isProjectPopulated,
    navigateToProject,
    navigateToFirstProjectOrHome,
    getBaseUsers,
    createProjectUser,
    updateProjectUser,
    removeProjectUser,
    clearBasesUser,
    toggleStarred,
    getBaseRoles,
  ])

  return (
    <BasesContext.Provider value={value}>
      {children}
    </BasesContext.Provider>
  )
}

/**
 * useBases hook
 * 
 * @example
 * ```tsx
 * const { 
 *   basesList, 
 *   loadProjects,
 *   createProject,
 *   navigateToProject 
 * } = useBases()
 * ```
 */
export function useBases(): UseBasesReturn {
  const context = useContext(BasesContext)
  if (!context) {
    throw new Error('useBases must be used within a BasesProvider')
  }
  return context
}

// 导出类型
export type { NcProject, User, UseBasesReturn } from './types'
