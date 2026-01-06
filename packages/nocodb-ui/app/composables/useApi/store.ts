/**
 * Token 存储管理
 * 适配 React/Next.js 的客户端存储
 * 
 * 注意：Token 同时存储在两个地方：
 * 1. nocodb-gui-v2 对象中（useGlobal 使用）
 * 2. nc_token 独立键（API 拦截器和 middleware 使用）
 */

const TOKEN_KEY = 'nc_token'
const STORAGE_KEY = 'nocodb-gui-v2'

/**
 * 获取存储的 token
 * 优先从独立 key 获取，如果没有则从全局状态对象获取
 */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  
  // 优先从独立 key 获取
  const directToken = localStorage.getItem(TOKEN_KEY)
  if (directToken) return directToken
  
  // 从全局状态对象获取
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.token) {
        // 同步到独立 key
        localStorage.setItem(TOKEN_KEY, parsed.token)
        return parsed.token
      }
    }
  } catch {
    // ignore
  }
  
  return null
}

/**
 * 设置 token 到存储
 * 同时更新独立 key 和全局状态对象
 */
export function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return
  
  // 更新独立 key
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
  
  // 更新全局状态对象
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      parsed.token = token
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
    }
  } catch {
    // ignore
  }
  
  // 更新 cookie（用于 middleware）
  if (typeof document !== 'undefined') {
    if (token) {
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString()
      document.cookie = `nc_token=${token}; path=/; expires=${expires}; SameSite=Lax`
    } else {
      document.cookie = 'nc_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }
  }
}

/**
 * 清除 token
 */
export function clearStoredToken(): void {
  setStoredToken(null)
}
