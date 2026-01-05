import type { GlobalState, Getters } from './types'

/**
 * 计算 signedIn 状态
 * 验证用户是否已登录：检查 token 是否存在且未过期
 */
export function computeSignedIn(state: GlobalState): boolean {
  if (!state.token || state.token === '') return false
  if (!state.jwtPayload) return false
  if (!state.jwtPayload.exp) return false
  
  const now = Date.now() / 1000
  return state.jwtPayload.exp > now
}

/**
 * 计算 isLoading 状态
 */
export function computeIsLoading(state: GlobalState): boolean {
  return state.runningRequests > 0
}

/**
 * 获取所有 getters
 */
export function getGetters(state: GlobalState): Getters {
  return {
    signedIn: computeSignedIn(state),
    isLoading: computeIsLoading(state),
  }
}
