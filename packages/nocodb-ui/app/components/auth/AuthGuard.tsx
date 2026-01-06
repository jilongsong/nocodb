"use client"

/**
 * AuthGuard 组件
 * 
 * 注意：认证重定向现在由 middleware.ts 处理
 * 此组件保留用于需要客户端认证检查的特殊场景
 */

import { useGlobal } from '@/app/composables/useGlobal'

interface AuthGuardProps {
  children: React.ReactNode
  /** 加载中显示的内容 */
  loadingComponent?: React.ReactNode
}

export function AuthGuard({
  children,
  loadingComponent,
}: AuthGuardProps) {
  const { isInitialized } = useGlobal()

  // 等待全局状态初始化
  if (!isInitialized) {
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
