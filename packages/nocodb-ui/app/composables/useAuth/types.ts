import type { User } from '../useGlobal/types'

/**
 * 登录表单数据
 */
export interface SignInFormData {
  email: string
  password: string
}

/**
 * 注册表单数据
 */
export interface SignUpFormData {
  email: string
  password: string
  firstname?: string
  lastname?: string
}

/**
 * 认证响应
 */
export interface AuthResponse {
  token?: string
  error?: string
}

/**
 * useAuth 返回类型
 */
export interface UseAuthReturn {
  /** 当前用户 */
  user: User | null
  /** 是否已登录 */
  isSignedIn: boolean
  /** 是否正在加载 */
  isLoading: boolean
  /** 错误信息 */
  error: string | null
  /** 登录 */
  signIn: (data: SignInFormData) => Promise<boolean>
  /** 注册 */
  signUp: (data: SignUpFormData) => Promise<boolean>
  /** 登出 */
  signOut: (options?: SignOutOptions) => Promise<void>
  /** 获取当前用户信息 */
  fetchMe: () => Promise<User | null>
  /** 清除错误 */
  clearError: () => void
}

/**
 * 登出选项
 */
export interface SignOutOptions {
  /** 是否重定向到登录页 */
  redirectToSignin?: boolean
  /** 登录页 URL */
  signinUrl?: string
  /** 跳过 API 调用 */
  skipApiCall?: boolean
}
