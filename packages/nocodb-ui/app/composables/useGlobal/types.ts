import type { JwtPayload } from 'jwt-decode'
import type { AxiosInstance } from 'axios'

/**
 * 用户信息
 */
export interface User {
  id: string
  email: string
  firstname?: string
  lastname?: string
  roles?: string
  display_name?: string
}

/**
 * 应用信息
 */
export interface AppInfo {
  ncSiteUrl: string
  authType: 'jwt' | 'none'
  allowLocalUrl?: boolean
  connectToExternalDB: boolean
  defaultLimit: number
  defaultGroupByLimit?: {
    limitGroup: number
    limitRecord: number
  }
  firstUser: boolean
  env?: string
  githubAuthEnabled: boolean
  googleAuthEnabled: boolean
  oidcAuthEnabled: boolean
  oidcProviderName: string | null
  ncMin: boolean
  oneClick: boolean
  baseHasAdmin: boolean
  teleEnabled: boolean
  errorReportingEnabled: boolean
  auditEnabled: boolean
  type: string
  version: string
  ee?: boolean
  ncAttachmentFieldSize: number
  ncMaxAttachmentsAllowed: number
  isCloud: boolean
  automationLogLevel: 'OFF' | 'ERROR' | 'ALL'
  baseHostName?: string
  baseUrl?: string
  disableEmailAuth: boolean
  mainSubDomain?: string
  dashboardPath: string
  inviteOnlySignup: boolean
  samlAuthEnabled: boolean
  samlProviderName: string | null
  giftUrl: string
  feedEnabled?: boolean
  sentryDSN?: string
  isOnPrem: boolean
  stripePublishableKey?: string
  marketingRootUrl?: string
  openReplayKey?: string | null
  disableSupportChat?: boolean
  disableOnboardingFlow?: boolean
  iframeWhitelistDomains?: Array<string>
}

/**
 * 语言枚举
 */
export type Language = 'en' | 'zh-Hans' | 'zh-Hant' | 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'pt' | 'ru'

/**
 * 持久化存储的状态
 */
export interface StoredState {
  token: string | null
  lang: Language
  darkMode: boolean
  filterAutoSave: boolean
  includeM2M: boolean
  showNull: boolean
  currentVersion: string | null
  latestRelease: string | null
  hiddenRelease: string | null
  isMobileMode: boolean | null
  lastOpenedWorkspaceId: string | null
  gridViewPageSize: number
  leftSidebarSize: {
    old: number
    current: number
  }
  isAddNewRecordGridMode: boolean
  syncDataUpvotes: string[]
  giftBannerDismissedCount: number
  isLeftSidebarOpen: boolean
}

/**
 * 全局状态（React 版本）
 */
export interface GlobalState extends StoredState {
  user: User | null
  jwtPayload: (JwtPayload & User) | null
  timestamp: number
  runningRequests: number
  error: Error | null
  appInfo: AppInfo
}

/**
 * Getters（计算属性）
 */
export interface Getters {
  signedIn: boolean
  isLoading: boolean
}

/**
 * 登出参数
 */
export interface SignOutParams {
  redirectToSignin?: boolean
  signinUrl?: string
  skipRedirect?: boolean
  skipApiCall?: boolean
}

/**
 * Actions（操作方法）
 */
export interface Actions {
  signOut: (signOutParams?: SignOutParams) => Promise<void>
  signIn: (token: string, keepProps?: boolean) => void
  refreshToken: (params?: {
    axiosInstance?: AxiosInstance
    skipLogout?: boolean
    cognitoOnly?: boolean
  }) => Promise<string | null | void>
  loadAppInfo: () => Promise<void>
  setIsMobileMode: (isMobileMode: boolean) => void
  navigateToProject: (params: { workspaceId?: string; baseId?: string; query?: Record<string, string> }) => void
  ncNavigateTo: (params: {
    workspaceId?: string
    baseId?: string
    query?: Record<string, string>
    tableId?: string
    tableTitle?: string
    viewId?: string
    viewTitle?: string
    automationId?: string
    automationTitle?: string
    replace?: boolean
    dashboardId?: string
    dashboardTitle?: string
    newTab?: boolean
  }) => void
  getBaseUrl: (workspaceId: string) => string | undefined
  getMainUrl: (workspaceId: string) => string | undefined
  setGridViewPageSize: (pageSize: number) => void
  setLeftSidebarSize: (params: { old?: number; current?: number }) => void
  setAddNewRecordGridMode: (isGridMode: boolean) => void
  updateSyncDataUpvotes: (upvotes: string[]) => void
  setToken: (token: string | null) => void
  setUser: (user: User | null) => void
  setAppInfo: (appInfo: AppInfo) => void
  setError: (error: Error | null) => void
  incrementRunningRequests: () => void
  decrementRunningRequests: () => void
}

/**
 * useGlobal 返回类型
 */
export interface UseGlobalReturn extends GlobalState, Getters, Actions {}
