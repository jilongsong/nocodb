"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { Api } from 'nocodb-sdk'
import type { CreateApiOptions, UseApiProps, UseApiReturn, EventCallback } from './types'
import { addAxiosInterceptors } from './interceptors'
import { getStoredToken, setStoredToken } from './store'

const BASE_FALLBACK_URL = 'http://localhost:8080'

/**
 * 创建 API 实例
 */
export function createApiInstance<SecurityDataType = any>({
  baseURL = BASE_FALLBACK_URL,
}: CreateApiOptions = {}): Api<SecurityDataType> {
  const finalBaseURL = process.env.NEXT_PUBLIC_NC_BACKEND_URL || baseURL
  return addAxiosInterceptors(
    new Api<SecurityDataType>({
      baseURL: finalBaseURL,
    }),
  )
}

// 全局 API 实例（单例）
let globalApiInstance: Api<any> | null = null

export function getGlobalApi(): Api<any> {
  if (!globalApiInstance) {
    globalApiInstance = createApiInstance()
  }
  return globalApiInstance
}

/**
 * 从 SDK 响应中提取错误信息
 */
export async function extractSdkResponseErrorMsg(error: AxiosError): Promise<string> {
  if (!error.response) {
    return error.message || '网络请求失败'
  }
  
  const data = error.response.data as Record<string, unknown> | undefined
  if (data) {
    return (data.msg as string) || (data.message as string) || `请求失败: ${error.response.status}`
  }
  
  return `请求失败: ${error.response.status}`
}

/**
 * React hook for API calls
 * 参照 nc-gui 的 useApi composable 实现
 *
 * @example
 * ```tsx
 * const { api, isLoading, error, response, onError, onResponse } = useApi()
 *
 * const onSignIn = async () => {
 *   const { token } = await api.auth.signin(form)
 * }
 * ```
 */
export function useApi<Data = any, RequestConfig = any>({
  useGlobalInstance = false,
  apiOptions,
  axiosConfig,
}: UseApiProps<Data> = {}): UseApiReturn<Data, RequestConfig> {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<AxiosResponse<Data, RequestConfig> | null>(null)
  
  const requestCount = useRef(0)
  const errorCallbacks = useRef<EventCallback<AxiosError<Data, RequestConfig>>[]>([])
  const responseCallbacks = useRef<EventCallback<AxiosResponse<Data, RequestConfig>>[]>([])

  // 创建或获取 API 实例
  const apiRef = useRef<Api<any> | null>(null)
  if (!apiRef.current) {
    apiRef.current = useGlobalInstance ? getGlobalApi() : createApiInstance(apiOptions)
  }
  const api = apiRef.current

  // 事件钩子
  const onError = useCallback((callback: EventCallback<AxiosError<Data, RequestConfig>>) => {
    errorCallbacks.current.push(callback)
  }, [])

  const onResponse = useCallback((callback: EventCallback<AxiosResponse<Data, RequestConfig>>) => {
    responseCallbacks.current.push(callback)
  }, [])

  // 请求开始
  const handleRequestStart = useCallback((config: InternalAxiosRequestConfig) => {
    if (config.url !== '/api/v1/notifications/poll') {
      setIsLoading(true)
      requestCount.current++
    }
  }, [])

  // 请求结束
  const handleRequestFinish = useCallback(() => {
    requestCount.current--
    if (requestCount.current === 0) {
      setIsLoading(false)
    }
  }, [])

  // 重置状态
  const reset = useCallback(() => {
    setError(null)
    setResponse(null)
  }, [])

  // 添加拦截器
  useEffect(() => {
    const requestInterceptor = api.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        reset()
        handleRequestStart(config)
        
        // 合并额外的 axios 配置
        if (axiosConfig) {
          Object.assign(config, axiosConfig)
        }
        return config
      },
      async (requestError: AxiosError<Data, RequestConfig>) => {
        errorCallbacks.current.forEach(cb => cb(requestError))
        const errorMsg = await extractSdkResponseErrorMsg(requestError)
        setError(errorMsg)
        setResponse(null)
        handleRequestFinish()
        return Promise.reject(requestError)
      }
    )

    const responseInterceptor = api.instance.interceptors.response.use(
      (apiResponse: AxiosResponse<Data, RequestConfig>) => {
        responseCallbacks.current.forEach(cb => cb(apiResponse))
        setResponse(apiResponse)
        handleRequestFinish()
        return apiResponse
      },
      async (apiError: AxiosError<Data, RequestConfig>) => {
        errorCallbacks.current.forEach(cb => cb(apiError))
        const errorMsg = await extractSdkResponseErrorMsg(apiError)
        setError(errorMsg)
        handleRequestFinish()
        return Promise.reject(apiError)
      }
    )

    return () => {
      api.instance.interceptors.request.eject(requestInterceptor)
      api.instance.interceptors.response.eject(responseInterceptor)
    }
  }, [api, axiosConfig, handleRequestStart, handleRequestFinish, reset])
 console.log(api)
  return {
    api,
    isLoading,
    error,
    response,
    onError,
    onResponse,
  }
}

// 导出 store 函数
export { getStoredToken, setStoredToken } from './store'
