"use client"

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGlobal } from '../useGlobal'
import { useApi } from '../useApi'
import type { User } from '../useGlobal/types'
import type { SignInFormData, SignUpFormData, SignOutOptions, UseAuthReturn } from './types'

/**
 * 认证相关的 composable
 * 封装登录、注册、登出、获取用户信息等逻辑
 * 
 * @example
 * ```tsx
 * const { user, isSignedIn, signIn, signOut, isLoading, error } = useAuth()
 * 
 * // 登录
 * const success = await signIn({ email, password })
 * if (success) {
 *   router.push('/workspace')
 * }
 * 
 * // 登出
 * await signOut({ redirectToSignin: true })
 * ```
 */
export function useAuth(): UseAuthReturn {
  const router = useRouter()
  const { api, isLoading: apiLoading, error: apiError } = useApi({ useGlobalInstance: true })
  const global = useGlobal()
  
  const [localError, setLocalError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 合并错误状态
  const error = localError || apiError

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setLocalError(null)
  }, [])

  /**
   * 登录
   */
  const signIn = useCallback(async (data: SignInFormData): Promise<boolean> => {
    setLocalError(null)
    setIsLoading(true)
    
    try {
      const response = await api.auth.signin({
        email: data.email,
        password: data.password,
      })
      
      if (response?.token) {
        // 使用全局状态的 signIn 方法保存 token
        global.signIn(response.token)
        return true
      }
      
      setLocalError('登录失败，请重试')
      return false
    } catch (e: any) {
      const errorMsg = e?.response?.data?.msg || e?.response?.data?.message || e?.message || '登录失败'
      setLocalError(errorMsg)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [api, global])

  /**
   * 注册
   */
  const signUp = useCallback(async (data: SignUpFormData): Promise<boolean> => {
    setLocalError(null)
    setIsLoading(true)
    
    try {
      const response = await api.auth.signup({
        email: data.email,
        password: data.password,
        firstname: data.firstname,
        lastname: data.lastname,
      })
      
      if (response?.token) {
        // 注册成功后自动登录
        global.signIn(response.token)
        return true
      }
      
      setLocalError('注册失败，请重试')
      return false
    } catch (e: any) {
      const errorMsg = e?.response?.data?.msg || e?.response?.data?.message || e?.message || '注册失败'
      setLocalError(errorMsg)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [api, global])

  /**
   * 登出
   */
  const signOut = useCallback(async (options: SignOutOptions = {}): Promise<void> => {
    const {
      redirectToSignin = true,
      signinUrl = '/signin',
      skipApiCall = false,
    } = options

    setIsLoading(true)
    
    try {
      await global.signOut({
        redirectToSignin: false,
        skipApiCall,
      })
      
      if (redirectToSignin) {
        router.push(signinUrl)
      }
    } catch (e: any) {
      console.error('Sign out error:', e)
    } finally {
      setIsLoading(false)
    }
  }, [global, router])

  /**
   * 获取当前用户信息
   */
  const fetchMe = useCallback(async (): Promise<User | null> => {
    setLocalError(null)
    setIsLoading(true)
    
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
        global.setUser(user)
        return user
      }
      
      return null
    } catch (e: any) {
      // 401 错误表示未登录，不需要显示错误
      if (e?.response?.status !== 401) {
        const errorMsg = e?.response?.data?.msg || e?.response?.data?.message || '获取用户信息失败'
        setLocalError(errorMsg)
      }
      return null
    } finally {
      setIsLoading(false)
    }
  }, [api, global])

  return {
    user: global.user,
    isSignedIn: global.signedIn,
    isLoading: isLoading || apiLoading,
    error,
    signIn,
    signUp,
    signOut,
    fetchMe,
    clearError,
  }
}

// 导出类型
export type { SignInFormData, SignUpFormData, SignOutOptions, UseAuthReturn } from './types'
