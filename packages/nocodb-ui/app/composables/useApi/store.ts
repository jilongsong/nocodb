/**
 * Token 存储管理
 * 适配 React/Next.js 的客户端存储
 */

const TOKEN_KEY = 'nc_token'

/**
 * 获取存储的 token
 */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * 设置 token 到存储
 */
export function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

/**
 * 清除 token
 */
export function clearStoredToken(): void {
  setStoredToken(null)
}
