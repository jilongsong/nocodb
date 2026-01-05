import type { Api } from 'nocodb-sdk'
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'

/** Event callback type for React */
export type EventCallback<T> = (data: T) => void

export interface UseApiReturn<D = any, R = any> {
  api: Api<any>
  isLoading: boolean
  error: string | null
  response: AxiosResponse<D, R> | null
  onError: (callback: EventCallback<AxiosError<D, R>>) => void
  onResponse: (callback: EventCallback<AxiosResponse<D, R>>) => void
}

/** {@link Api} options */
export interface CreateApiOptions {
  baseURL?: string
}

export interface UseApiProps<D = any> {
  /** additional axios config for requests */
  axiosConfig?: AxiosRequestConfig<D>
  /** {@link Api} options */
  apiOptions?: CreateApiOptions
  useGlobalInstance?: boolean
}
