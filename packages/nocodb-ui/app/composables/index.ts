/**
 * Composables 导出
 */

// useApi
export {
  useApi,
  createApiInstance,
  getGlobalApi,
  extractSdkResponseErrorMsg,
  getStoredToken,
  setStoredToken,
} from './useApi'

export type {
  CreateApiOptions,
  UseApiProps,
  UseApiReturn,
  EventCallback,
} from './useApi/types'

export type {
  RouteParams,
  InterceptorOptions,
} from './useApi/interceptors'

// useGlobal
export {
  useGlobal,
  GlobalProvider,
  loadStoredState,
  saveStoredState,
  updateStoredState,
  getGetters,
  computeSignedIn,
  computeIsLoading,
  createActions,
} from './useGlobal'

export type {
  UseGlobalReturn,
  GlobalState,
  Actions,
  User,
  AppInfo,
  StoredState,
  SignOutParams,
  Getters,
  Language,
} from './useGlobal/types'

// useAuth
export {
  useAuth,
} from './useAuth'

export type {
  SignInFormData,
  SignUpFormData,
  SignOutOptions,
  UseAuthReturn,
} from './useAuth/types'
