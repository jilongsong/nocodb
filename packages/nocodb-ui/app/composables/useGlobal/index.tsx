"use client"

import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { GlobalState, UseGlobalReturn, Actions } from './types'
import { loadStoredState, getInitialAppInfo } from './state'
import { getGetters } from './getters'
import { createActions } from './actions'
import { getGlobalApi } from '../useApi'

/**
 * 获取初始全局状态
 */
function getInitialGlobalState(): GlobalState {
  const storedState = loadStoredState()
  return {
    ...storedState,
    user: null,
    jwtPayload: null,
    timestamp: Date.now(),
    runningRequests: 0,
    error: null,
    appInfo: getInitialAppInfo(),
  }
}

/**
 * 全局状态 Context
 */
const GlobalContext = createContext<UseGlobalReturn | null>(null)

/**
 * 全局状态 Provider
 */
export function GlobalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [state, setStateInternal] = useState<GlobalState>(getInitialGlobalState)
  const stateRef = useRef(state)
  
  // 保持 ref 同步
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // 更新状态的方法
  const setState = useCallback((updates: Partial<GlobalState>) => {
    setStateInternal(prev => ({ ...prev, ...updates }))
  }, [])

  // 获取当前状态
  const getState = useCallback(() => stateRef.current, [])

  // 导航方法
  const navigate = useCallback((path: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      router.replace(path)
    } else {
      router.push(path)
    }
  }, [router])

  // 获取 API 实例
  const api = useMemo(() => getGlobalApi(), [])

  // 创建 actions
  const actions = useMemo<Actions>(() => {
    return createActions({ api, navigate, setState, getState })
  }, [api, navigate, setState, getState])

  // 计算 getters
  const getters = useMemo(() => getGetters(state), [state])

  // 初始化时从 localStorage 加载状态
  useEffect(() => {
    const storedState = loadStoredState()
    setState(storedState)
    
    // 如果有 token，解析 JWT payload
    if (storedState.token) {
      try {
        const base64Url = storedState.token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jwtPayload = JSON.parse(window.atob(base64))
        setState({ 
          jwtPayload,
          user: {
            id: jwtPayload.id,
            email: jwtPayload.email,
            firstname: jwtPayload.firstname,
            lastname: jwtPayload.lastname,
            roles: jwtPayload.roles,
            display_name: jwtPayload.display_name,
          }
        })
      } catch {
        console.error('Failed to parse stored JWT token')
      }
    }

    // 加载 appInfo
    actions.loadAppInfo()
  }, [setState, actions])

  // 定时更新 timestamp
  useEffect(() => {
    const interval = setInterval(() => {
      setState({ timestamp: Date.now() })
    }, 1000)
    return () => clearInterval(interval)
  }, [setState])

  // 组合最终的返回值
  const value = useMemo<UseGlobalReturn>(() => ({
    ...state,
    ...getters,
    ...actions,
  }), [state, getters, actions])

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  )
}

/**
 * 使用全局状态的 hook
 * 
 * @example
 * ```tsx
 * const { token, user, signIn, signOut, isLoading } = useGlobal()
 * 
 * // 登录
 * signIn(token)
 * 
 * // 检查是否已登录
 * if (signedIn) {
 *   console.log('User:', user)
 * }
 * ```
 */
export function useGlobal(): UseGlobalReturn {
  const context = useContext(GlobalContext)
  if (!context) {
    throw new Error('useGlobal must be used within a GlobalProvider')
  }
  return context
}

// 导出类型和工具函数
export type { UseGlobalReturn, GlobalState, Actions } from './types'
export { loadStoredState, saveStoredState, updateStoredState } from './state'
export { getGetters, computeSignedIn, computeIsLoading } from './getters'
export { createActions } from './actions'
