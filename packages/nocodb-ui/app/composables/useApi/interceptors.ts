import type { Api } from 'nocodb-sdk'
import type { AxiosError } from 'axios'
import { getStoredToken, setStoredToken } from './store'

const DbNotFoundMsg = 'Database config not found'
const TIMEOUT_RETRY_COUNT = 1

export interface RouteParams {
  typeOrId?: string
  baseId?: string
  erdUuid?: string
  [key: string]: string | undefined
}

export interface InterceptorOptions {
  /** 获取当前路由路径 */
  getPathname?: () => string
  /** 获取路由参数 */
  getParams?: () => RouteParams
  /** 导航到指定路径 */
  navigate?: (path: string) => void
  /** 是否跳过 socket */
  skipSocket?: boolean
}

/**
 * 为 API 实例添加 axios 拦截器
 * 适配 React/Next.js 框架
 */
export function addAxiosInterceptors(
  api: Api<any>,
  options: InterceptorOptions = {}
): Api<any> {
  const { 
    getPathname = () => typeof window !== 'undefined' ? window.location.pathname : '',
    getParams = (): RouteParams => ({}),
    navigate = (path: string) => {
      if (typeof window !== 'undefined') {
        window.location.href = path
      }
    },
    skipSocket = false,
  } = options

  const axiosInstance = api.instance

  // 请求拦截器
  axiosInstance.interceptors.request.use((config) => {
    // 添加 GUI 标识
    config.headers['xc-gui'] = 'true'
    
    // Socket ID（暂时跳过，React 版本需要单独实现 socket）
    if (!skipSocket) {
      config.headers['xc-socket-id'] = null
    }

    // 添加认证 token
    const token = getStoredToken()
    if (token && !config.headers['xc-short-token']) {
      config.headers['xc-auth'] = token
    }

    // 处理共享页面的特殊 headers
    const params = getParams()
    if (!config.url?.endsWith('/user/me') && !config.url?.endsWith('/admin/roles')) {
      if (params.typeOrId === 'base' && params.baseId) {
        config.headers['xc-shared-base-id'] = params.baseId
        delete config.headers['xc-auth']
      } else if (params.typeOrId === 'ERD' && params.erdUuid) {
        config.headers['xc-shared-erd-id'] = params.erdUuid
        delete config.headers['xc-auth']
      }
    }

    return config
  })

  // 响应拦截器
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (error.code === 'ERR_CANCELED') {
        return Promise.reject(error)
      }

      // 数据库配置未找到
      const errorData = error.response?.data as { msg?: string } | undefined
      if (errorData?.msg === DbNotFoundMsg) {
        navigate('/base/0')
        return Promise.reject(error)
      }

      // 非 401 错误直接返回
      if (!error.response || error.response.status !== 401) {
        return Promise.reject(error)
      }

      // Token 刷新请求失败，直接登出
      if (error.config?.url === '/auth/token/refresh') {
        setStoredToken(null)
        navigate('/signin')
        return Promise.reject(error)
      }

      // 尝试刷新 token
      let retry = 0
      do {
        try {
          const refreshResponse = await axiosInstance.post('/auth/token/refresh')
          const newToken = refreshResponse.data?.token

          if (!newToken) {
            setStoredToken(null)
            navigate('/signin')
            return Promise.reject(error)
          }

          // 更新 token 并重试原请求
          setStoredToken(newToken)
          if (error.config) {
            error.config.headers['xc-auth'] = newToken
            const response = await axiosInstance.request(error.config)
            return response
          }
        } catch (refreshTokenError) {
          if ((refreshTokenError as AxiosError)?.code === 'ERR_CANCELED') {
            return Promise.reject(refreshTokenError)
          }

          if (retry >= TIMEOUT_RETRY_COUNT) {
            setStoredToken(null)
            navigate('/signin')
            return Promise.reject(error)
          }
        }
      } while (retry++ < TIMEOUT_RETRY_COUNT)

      return Promise.reject(error)
    },
  )

  return api
}
