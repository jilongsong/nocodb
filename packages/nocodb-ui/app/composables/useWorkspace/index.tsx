"use client"

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { 
  NcWorkspace, 
  ActivePage, 
  WorkspaceState, 
  UseWorkspaceReturn 
} from './types'
import { useGlobal } from '../useGlobal'
import { getGlobalApi, extractSdkResponseErrorMsg } from '../useApi'

/**
 * 获取初始 Workspace 状态
 */
function getInitialState(): WorkspaceState {
  return {
    workspaces: new Map(),
    collaborators: null,
    allCollaborators: null,
    isWorkspaceLoading: true,
    isWorkspacesLoading: false,
    isCollaboratorsLoading: true,
    isInvitingCollaborators: false,
    workspaceUserCount: undefined,
    workspaceOwnerCount: undefined,
    deletingWorkspace: false,
    lastPopulatedWorkspaceId: null,
    removingCollaboratorMap: {},
  }
}

/**
 * Workspace Context
 */
const WorkspaceContext = createContext<UseWorkspaceReturn | null>(null)

/**
 * Workspace Provider
 */
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const { appInfo } = useGlobal()
  const api = useMemo(() => getGlobalApi(), [])

  // State
  const [state, setState] = useState<WorkspaceState>(getInitialState)

  // 更新状态的辅助方法
  const updateState = useCallback((updates: Partial<WorkspaceState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  // Computed: workspacesList
  const workspacesList = useMemo(() => {
    return Array.from(state.workspaces.values()).sort(
      (a, b) => new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime()
    )
  }, [state.workspaces])

  // Computed: activeWorkspaceId (默认为 'default' - OSS 版本)
  const activeWorkspaceId = useMemo(() => 'default', [])

  // Computed: activeWorkspace
  const activeWorkspace = useMemo<NcWorkspace>(() => {
    return { id: 'default', title: 'default', meta: {}, roles: '' }
  }, [])

  // Computed: activeWorkspaceMeta
  const activeWorkspaceMeta = useMemo(() => {
    if (!activeWorkspace) return {}
    try {
      const meta = activeWorkspace.meta
      return typeof meta === 'string' ? JSON.parse(meta) : (meta || {})
    } catch {
      return {}
    }
  }, [activeWorkspace])

  // Computed: workspaceRole
  const workspaceRole = useMemo(() => activeWorkspace?.roles, [activeWorkspace])

  // Computed: activePage
  const activePage = useMemo<ActivePage>(() => {
    const page = searchParams.get('page') as ActivePage
    return page || 'recent'
  }, [searchParams])

  // Computed: 页面状态检测
  const isWorkspaceSettingsPageOpened = useMemo(() => {
    return pathname?.includes('/settings') || false
  }, [pathname])

  const isIntegrationsPageOpened = useMemo(() => {
    return pathname?.includes('/integrations') || false
  }, [pathname])

  const isFeedPageOpened = useMemo(() => {
    return pathname?.includes('/feed') || false
  }, [pathname])

  // Actions
  const loadWorkspaces = useCallback(async () => {
    // OSS 版本不需要加载 workspaces
  }, [])

  const createWorkspace = useCallback(async (_data: Partial<NcWorkspace>) => {
    // OSS 版本不支持创建 workspace
    return undefined
  }, [])

  const updateWorkspace = useCallback(async (_id: string, _data: Partial<NcWorkspace>) => {
    // OSS 版本不支持更新 workspace
  }, [])

  const deleteWorkspace = useCallback(async (_id: string) => {
    // OSS 版本不支持删除 workspace
  }, [])

  const loadCollaborators = useCallback(async () => {
    // 加载协作者
  }, [])

  const inviteCollaborator = useCallback(async (_email: string, _role: string) => {
    // 邀请协作者
  }, [])

  const removeCollaborator = useCallback(async (_userId: string) => {
    // 移除协作者
  }, [])

  const updateCollaborator = useCallback(async (_userId: string, _role: string) => {
    // 更新协作者角色
  }, [])

  const loadWorkspace = useCallback(async (_id: string) => {
    // 加载单个 workspace
  }, [])

  const populateWorkspace = useCallback(async () => {
    updateState({ isWorkspaceLoading: true })
    try {
      // 这里会调用 useBases 的 loadProjects
      // 暂时保留为空，等 useBases 完成后再集成
    } catch (e) {
      console.error(e)
    } finally {
      updateState({ isWorkspaceLoading: false })
    }
  }, [updateState])

  const clearWorkspaces = useCallback(async () => {
    updateState({
      workspaces: new Map(),
      collaborators: null,
      allCollaborators: null,
    })
  }, [updateState])

  const navigateToWorkspace = useCallback(async (workspaceId?: string) => {
    const id = workspaceId || activeWorkspaceId
    if (!id) {
      throw new Error('Workspace not selected')
    }
    router.push(`/workspace`)
  }, [router, activeWorkspaceId])

  const navigateToWorkspaceSettings = useCallback(async (_?: string, cmdOrCtrl?: boolean) => {
    const path = '/account/users'
    if (cmdOrCtrl) {
      window.open(path, '_blank')
    } else {
      router.push(path)
    }
  }, [router])

  const navigateToIntegrations = useCallback(async (_?: string, cmdOrCtrl?: boolean, query: Record<string, string> = {}) => {
    const searchStr = new URLSearchParams(query).toString()
    const path = `/workspace/integrations${searchStr ? `?${searchStr}` : ''}`
    if (cmdOrCtrl) {
      window.open(path, '_blank')
    } else {
      router.push(path)
    }
  }, [router])

  const navigateToFeed = useCallback(async (_?: string, cmdOrCtrl?: boolean, query: Record<string, string> = {}) => {
    const searchStr = new URLSearchParams(query).toString()
    const path = `/workspace/feed${searchStr ? `?${searchStr}` : ''}`
    if (cmdOrCtrl) {
      window.open(path, '_blank')
    } else {
      router.push(path)
    }
  }, [router])

  const setLoadingState = useCallback((isLoading: boolean) => {
    updateState({ isWorkspaceLoading: isLoading })
  }, [updateState])

  const addToFavourite = useCallback(async (baseId: string) => {
    try {
      await api.base.userMetaUpdate(baseId, { starred: true })
    } catch (e: any) {
      const msg = await extractSdkResponseErrorMsg(e)
      console.error(msg)
    }
  }, [api])

  const removeFromFavourite = useCallback(async (baseId: string) => {
    try {
      await api.base.userMetaUpdate(baseId, { starred: false })
    } catch (e: any) {
      const msg = await extractSdkResponseErrorMsg(e)
      console.error(msg)
    }
  }, [api])

  const updateProjectTitle = useCallback(async (base: { id?: string; temp_title: string; title?: string; edit?: boolean }) => {
    if (!base.id) return
    try {
      await api.base.update(base.id, { title: base.temp_title })
    } catch (e: any) {
      const msg = await extractSdkResponseErrorMsg(e)
      console.error(msg)
    }
  }, [api])

  const getPlanLimit = useCallback((_arg: any) => {
    return Infinity
  }, [])

  // 组合返回值
  const value = useMemo<UseWorkspaceReturn>(() => ({
    // State
    ...state,
    // Getters
    workspacesList,
    activeWorkspaceId,
    activeWorkspace,
    activeWorkspaceMeta,
    workspaceRole,
    activePage,
    isWorkspaceSettingsPageOpened,
    isIntegrationsPageOpened,
    isFeedPageOpened,
    // Actions
    loadWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    loadCollaborators,
    inviteCollaborator,
    removeCollaborator,
    updateCollaborator,
    loadWorkspace,
    populateWorkspace,
    clearWorkspaces,
    navigateToWorkspace,
    navigateToWorkspaceSettings,
    navigateToIntegrations,
    navigateToFeed,
    setLoadingState,
    addToFavourite,
    removeFromFavourite,
    updateProjectTitle,
    getPlanLimit,
  }), [
    state,
    workspacesList,
    activeWorkspaceId,
    activeWorkspace,
    activeWorkspaceMeta,
    workspaceRole,
    activePage,
    isWorkspaceSettingsPageOpened,
    isIntegrationsPageOpened,
    isFeedPageOpened,
    loadWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    loadCollaborators,
    inviteCollaborator,
    removeCollaborator,
    updateCollaborator,
    loadWorkspace,
    populateWorkspace,
    clearWorkspaces,
    navigateToWorkspace,
    navigateToWorkspaceSettings,
    navigateToIntegrations,
    navigateToFeed,
    setLoadingState,
    addToFavourite,
    removeFromFavourite,
    updateProjectTitle,
    getPlanLimit,
  ])

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

/**
 * useWorkspace hook
 * 
 * @example
 * ```tsx
 * const { 
 *   activeWorkspace, 
 *   workspacesList,
 *   isWorkspaceLoading,
 *   populateWorkspace 
 * } = useWorkspace()
 * ```
 */
export function useWorkspace(): UseWorkspaceReturn {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}

// 导出类型
export type { NcWorkspace, ActivePage, UseWorkspaceReturn } from './types'
