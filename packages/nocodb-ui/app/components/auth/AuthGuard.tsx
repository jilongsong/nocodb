"use client"

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useGlobal } from '@/app/composables/useGlobal'
import { useApi } from '@/app/composables/useApi'
import type { User } from '@/app/composables/useGlobal/types'

interface AuthGuardProps {
  children: React.ReactNode
  /** 需要登录才能访问，默认 true */
  requireAuth?: boolean
  /** 未登录时重定向的路径 */
  redirectTo?: string
  /** 已登录时重定向的路径（用于登录/注册页面） */
  redirectIfAuthenticated?: string
  /** 加载中显示的内容 */
  loadingComponent?: React.ReactNode
}

export function AuthGuard({
  children,
  requireAuth = true,
  redirectTo = '/signin',
  redirectIfAuthenticated,
  loadingComponent,
}: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { signedIn, token, setUser } = useGlobal()
  const { api } = useApi({ useGlobalInstance: true })
  
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  // 使用 ref 追踪是否已经检查过，避免重复调用
  const hasCheckedRef = useRef(false)
  const currentTokenRef = useRef(token)

  // 只在 token 变化时重置检查状态
  useEffect(() => {
    if (currentTokenRef.current !== token) {
      currentTokenRef.current = token
      hasCheckedRef.current = false
      setIsChecking(true)
    }
  }, [token])

  useEffect(() => {
    // 如果已经检查过，不再重复检查
    if (hasCheckedRef.current) return
    
    const checkAuth = async () => {
      hasCheckedRef.current = true
      
      // 如果有 token，尝试获取用户信息验证 token 有效性
      if (token) {
        try {
          const response = await api.auth.me() as any
          if (response) {
            const user: User = {
              id: response.id || '',
              email: response.email || '',
              firstname: response.firstname,
              lastname: response.lastname,
              roles: response.roles,
              display_name: response.display_name,
            }
            setUser(user)
          }
        } catch (e) {
          // 忽略错误，signedIn 状态会处理
        }
      }
      
      setIsChecking(false)
    }
    
    checkAuth()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isChecking) return

    if (requireAuth) {
      // 需要登录但未登录，重定向到登录页
      if (!signedIn) {
        const redirectUrl = `${redirectTo}?redirect_to=${encodeURIComponent(pathname)}`
        router.replace(redirectUrl)
        setIsAuthorized(false)
      } else {
        setIsAuthorized(true)
      }
    } else {
      // 不需要登录（如登录页）
      if (signedIn && redirectIfAuthenticated) {
        // 已登录用户重定向
        router.replace(redirectIfAuthenticated)
        setIsAuthorized(false)
      } else {
        setIsAuthorized(true)
      }
    }
  }, [isChecking, signedIn, requireAuth, redirectTo, redirectIfAuthenticated, pathname, router])

  // 正在检查认证状态
  if (isChecking) {
    return loadingComponent || <AuthLoadingSpinner />
  }

  // 未授权，等待重定向
  if (!isAuthorized) {
    return loadingComponent || <AuthLoadingSpinner />
  }

  return <>{children}</>
}

/**
 * 默认加载动画
 */
function AuthLoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">正在加载...</p>
      </div>
    </div>
  )
}

export default AuthGuard
