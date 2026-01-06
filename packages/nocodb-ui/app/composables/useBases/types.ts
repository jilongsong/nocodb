import type { BaseType, SourceType } from 'nocodb-sdk'

/**
 * 扩展的 Base 类型
 */
export interface NcProject extends BaseType {
  isExpanded?: boolean
  isLoading?: boolean
  order?: number
  starred?: boolean
  created_at?: string
  updated_at?: string
}

/**
 * 用户类型
 */
export interface User {
  id: string
  email: string
  roles?: string
  display_name?: string
}

/**
 * useBases 状态
 */
export interface BasesState {
  bases: Map<string, NcProject>
  basesUser: Map<string, User[]>
  baseRoles: Record<string, any>
  isProjectsLoading: boolean
  isProjectsLoaded: boolean
  showProjectList: boolean
  baseHomeSearchQuery: string
}

/**
 * useBases Getters
 */
export interface BasesGetters {
  basesList: NcProject[]
  activeProjectId: string | undefined
  openedProject: NcProject | undefined
  openedProjectBasesMap: Map<string, SourceType>
  isDataSourceLimitReached: boolean
}

/**
 * useBases Actions
 */
export interface BasesActions {
  loadProjects: (page?: 'recent' | 'shared' | 'starred' | 'workspace') => Promise<BaseType[] | undefined>
  loadProject: (baseId: string, force?: boolean) => Promise<NcProject | undefined>
  createProject: (payload: { title: string; workspaceId?: string; linkedDbProjectIds?: string[]; meta?: Record<string, unknown> }) => Promise<BaseType | undefined>
  updateProject: (baseId: string, payload: Partial<BaseType>) => Promise<void>
  deleteProject: (baseId: string) => Promise<void>
  getProjectMeta: (baseId: string) => Record<string, any>
  getProjectMetaInfo: (baseId: string) => Promise<any>
  setProject: (baseId: string, base: NcProject) => void
  clearBases: () => void
  isProjectEmpty: (baseId: string) => boolean
  isProjectPopulated: (baseId: string) => boolean
  navigateToProject: (params: { baseId: string; page?: 'collaborators'; query?: any }) => Promise<void>
  navigateToFirstProjectOrHome: () => Promise<void>
  getBaseUsers: (params: { baseId: string; searchText?: string; force?: boolean }) => Promise<{ users: User[]; totalRows: number }>
  createProjectUser: (baseId: string, user: User) => Promise<void>
  updateProjectUser: (baseId: string, user: User) => Promise<void>
  removeProjectUser: (baseId: string, user: User) => Promise<void>
  clearBasesUser: () => void
  toggleStarred: (baseId: string) => Promise<void>
  getBaseRoles: (baseId: string) => Promise<void>
}

/**
 * useBases 返回类型
 */
export interface UseBasesReturn extends BasesState, BasesGetters, BasesActions {}
