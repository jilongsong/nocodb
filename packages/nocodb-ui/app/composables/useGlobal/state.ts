import type { AppInfo, StoredState, Language } from './types'

const INITIAL_LEFT_SIDEBAR_WIDTH = 288
const MAX_WIDTH_FOR_MOBILE_MODE = 768
const STORAGE_KEY = 'nocodb-gui-v2'
const BASE_FALLBACK_URL = 'http://localhost:8080'

/**
 * 获取浏览器首选语言
 */
function getPreferredLanguage(): Language {
  if (typeof window === 'undefined') return 'en'
  
  const languages = navigator.languages || [navigator.language]
  const supportedLanguages: Language[] = ['en', 'zh-Hans', 'zh-Hant', 'ja', 'ko', 'fr', 'de', 'es', 'pt', 'ru']
  
  for (const lang of languages) {
    const [code] = lang.split(/[_-]/)
    const matched = supportedLanguages.find(l => l.startsWith(code))
    if (matched) return matched
  }
  
  return 'en'
}

/**
 * 检查是否为移动端视口
 */
function isViewPortMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < MAX_WIDTH_FOR_MOBILE_MODE
}

/**
 * 获取初始状态
 */
export function getInitialStoredState(): StoredState {
  return {
    token: null,
    lang: getPreferredLanguage(),
    darkMode: false,
    filterAutoSave: true,
    includeM2M: false,
    showNull: false,
    currentVersion: null,
    latestRelease: null,
    hiddenRelease: null,
    isMobileMode: null,
    lastOpenedWorkspaceId: null,
    gridViewPageSize: 25,
    leftSidebarSize: {
      old: INITIAL_LEFT_SIDEBAR_WIDTH,
      current: INITIAL_LEFT_SIDEBAR_WIDTH,
    },
    isAddNewRecordGridMode: true,
    syncDataUpvotes: [],
    giftBannerDismissedCount: 0,
    isLeftSidebarOpen: !isViewPortMobile(),
  }
}

/**
 * 获取初始 AppInfo
 */
export function getInitialAppInfo(): AppInfo {
  const ncSiteUrl = process.env.NEXT_PUBLIC_NC_BACKEND_URL || BASE_FALLBACK_URL
  
  return {
    ncSiteUrl,
    authType: 'jwt',
    connectToExternalDB: false,
    defaultLimit: 0,
    firstUser: true,
    githubAuthEnabled: false,
    googleAuthEnabled: false,
    oidcAuthEnabled: false,
    oidcProviderName: null,
    openReplayKey: null,
    samlAuthEnabled: false,
    samlProviderName: null,
    ncMin: false,
    oneClick: false,
    baseHasAdmin: false,
    teleEnabled: true,
    errorReportingEnabled: false,
    auditEnabled: true,
    type: 'nocodb',
    version: '0.0.0',
    ncAttachmentFieldSize: 20,
    ncMaxAttachmentsAllowed: 10,
    isCloud: false,
    automationLogLevel: 'OFF',
    disableEmailAuth: false,
    dashboardPath: '/dashboard',
    inviteOnlySignup: false,
    giftUrl: '',
    isOnPrem: false,
  }
}

/**
 * 从 localStorage 加载状态
 */
export function loadStoredState(): StoredState {
  if (typeof window === 'undefined') {
    return getInitialStoredState()
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<StoredState>
      return { ...getInitialStoredState(), ...parsed }
    }
  } catch (e) {
    console.error('Failed to load stored state:', e)
  }
  
  return getInitialStoredState()
}

/**
 * 保存状态到 localStorage
 */
export function saveStoredState(state: StoredState): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save stored state:', e)
  }
}

/**
 * 更新部分状态并保存
 */
export function updateStoredState(updates: Partial<StoredState>): StoredState {
  const current = loadStoredState()
  const updated = { ...current, ...updates }
  saveStoredState(updated)
  return updated
}

export { STORAGE_KEY, BASE_FALLBACK_URL, INITIAL_LEFT_SIDEBAR_WIDTH, MAX_WIDTH_FOR_MOBILE_MODE }
