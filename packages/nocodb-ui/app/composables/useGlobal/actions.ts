import type { Api } from 'nocodb-sdk'
import type { AxiosInstance } from 'axios'
import type { AppInfo, SignOutParams, User, GlobalState } from './types'
import { updateStoredState } from './state'

/**
 * 将标题转换为可读的 URL slug
 */
function toReadableUrlSlug(titles: (string | undefined)[]): string {
  return titles
    .filter(Boolean)
    .map(t => t!.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
    .join('-')
}

export interface ActionDependencies {
  api: Api<unknown>
  navigate: (path: string, options?: { replace?: boolean }) => void
  setState: (updates: Partial<GlobalState>) => void
  getState: () => GlobalState
}

/**
 * 创建全局 actions
 */
export function createActions(deps: ActionDependencies) {
  const { api, navigate, setState, getState } = deps

  const setIsMobileMode = (isMobileMode: boolean) => {
    setState({ isMobileMode })
    updateStoredState({ isMobileMode })
  }

  const signOut = async ({
    redirectToSignin = false,
    signinUrl = '/signin',
    skipApiCall = false,
  }: SignOutParams = {}) => {
    try {
      if (!skipApiCall) {
        await api.auth.signout()
      }
    } catch {
      // ignore error
    } finally {
      setState({ token: null, user: null })
      updateStoredState({ token: null })

      if (redirectToSignin) {
        navigate(signinUrl)
      }
    }
  }

  const signIn = (newToken: string, keepProps = false) => {
    const state = getState()
    
    // 解析 JWT payload
    let jwtPayload: (User & { exp?: number }) | null = null
    try {
      const base64Url = newToken.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      jwtPayload = JSON.parse(window.atob(base64))
    } catch {
      console.error('Failed to parse JWT token')
    }

    let user: User | null = null
    if (jwtPayload) {
      user = {
        ...(keepProps && state.user?.id === jwtPayload.id ? state.user || {} : {}),
        id: jwtPayload.id,
        email: jwtPayload.email,
        firstname: jwtPayload.firstname,
        lastname: jwtPayload.lastname,
        roles: jwtPayload.roles,
        display_name: jwtPayload.display_name,
      }
    }

    setState({ token: newToken, user, jwtPayload })
    updateStoredState({ token: newToken })
  }

  const refreshToken = async (params?: {
    axiosInstance?: AxiosInstance
    skipLogout?: boolean
  }): Promise<string | null> => {
    const axiosInstance = params?.axiosInstance || api.instance
    const skipLogout = params?.skipLogout || false

    try {
      const response = await axiosInstance.post('/auth/token/refresh', null, {
        withCredentials: true,
      })
      if (response.data?.token) {
        signIn(response.data.token, true)
        return response.data.token
      }
      return null
    } catch {
      const state = getState()
      if (state.token && state.user && !skipLogout) {
        await signOut({ skipApiCall: true })
      }
      return null
    }
  }

  const loadAppInfo = async () => {
    try {
      const appInfo = (await api.utils.appInfo()) as AppInfo
      setState({ appInfo })
    } catch (e) {
      console.error('Failed to load app info:', e)
    }
  }

  const navigateToProject = ({
    workspaceId: _workspaceId,
    baseId,
    query,
  }: {
    workspaceId?: string
    baseId?: string
    query?: Record<string, string>
  }) => {
    const workspaceId = _workspaceId || 'nc'
    const queryParams = query ? `?${new URLSearchParams(query).toString()}` : ''
    const path = baseId 
      ? `/${workspaceId}/${baseId}${queryParams}`
      : `/${workspaceId}${queryParams}`
    
    navigate(path)
  }

  const ncNavigateTo = ({
    workspaceId: _workspaceId,
    baseId,
    query,
    tableId,
    tableTitle,
    viewId,
    viewTitle,
    replace = false,
    newTab = false,
  }: {
    workspaceId?: string
    baseId?: string
    query?: Record<string, string>
    tableId?: string
    tableTitle?: string
    viewId?: string
    viewTitle?: string
    replace?: boolean
    newTab?: boolean
  }) => {
    const tablePath = tableId
      ? `/${tableId}${
          viewId
            ? `/${viewId}${toReadableUrlSlug([tableTitle, viewTitle]) ? `/${toReadableUrlSlug([tableTitle, viewTitle])}` : ''}`
            : ''
        }`
      : ''

    const workspaceId = _workspaceId || 'nc'
    const queryParams = query ? `?${new URLSearchParams(query).toString()}` : ''
    const path = baseId
      ? `/${workspaceId}/${baseId}${tablePath}${queryParams}`
      : `/${workspaceId}${queryParams}`

    if (newTab) {
      window.open(`${window.location.origin}${path}`, '_blank')
    } else {
      navigate(path, { replace })
    }
  }

  const getBaseUrl = (workspaceId: string): string | undefined => {
    const state = getState()
    if (state.appInfo.baseUrl) {
      return state.appInfo.baseUrl
    }

    if (state.appInfo.baseHostName && typeof location !== 'undefined' && 
        location.hostname !== `${workspaceId}.${state.appInfo.baseHostName}`) {
      return `https://${workspaceId}.${state.appInfo.baseHostName}`
    }
    return undefined
  }

  const getMainUrl = (): string | undefined => {
    return undefined
  }

  const setGridViewPageSize = (pageSize: number) => {
    setState({ gridViewPageSize: pageSize })
    updateStoredState({ gridViewPageSize: pageSize })
  }

  const setLeftSidebarSize = ({ old, current }: { old?: number; current?: number }) => {
    const state = getState()
    const newSize = {
      old: old ?? state.leftSidebarSize.old,
      current: current ?? state.leftSidebarSize.current,
    }
    setState({ leftSidebarSize: newSize })
    updateStoredState({ leftSidebarSize: newSize })
  }

  const setAddNewRecordGridMode = (isGridMode: boolean) => {
    setState({ isAddNewRecordGridMode: isGridMode })
    updateStoredState({ isAddNewRecordGridMode: isGridMode })
  }

  const updateSyncDataUpvotes = (upvotes: string[]) => {
    setState({ syncDataUpvotes: upvotes })
    updateStoredState({ syncDataUpvotes: upvotes })
  }

  const setToken = (token: string | null) => {
    setState({ token })
    updateStoredState({ token })
  }

  const setUser = (user: User | null) => {
    setState({ user })
  }

  const setAppInfo = (appInfo: AppInfo) => {
    setState({ appInfo })
  }

  const setError = (error: Error | null) => {
    setState({ error })
  }

  const incrementRunningRequests = () => {
    const state = getState()
    setState({ runningRequests: state.runningRequests + 1 })
  }

  const decrementRunningRequests = () => {
    const state = getState()
    setState({ runningRequests: Math.max(0, state.runningRequests - 1) })
  }

  return {
    signIn,
    signOut,
    refreshToken,
    loadAppInfo,
    setIsMobileMode,
    navigateToProject,
    getBaseUrl,
    ncNavigateTo,
    getMainUrl,
    setGridViewPageSize,
    setLeftSidebarSize,
    setAddNewRecordGridMode,
    updateSyncDataUpvotes,
    setToken,
    setUser,
    setAppInfo,
    setError,
    incrementRunningRequests,
    decrementRunningRequests,
  }
}
