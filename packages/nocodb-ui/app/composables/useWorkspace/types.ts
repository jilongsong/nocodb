import type { BaseType } from 'nocodb-sdk'

/**
 * Workspace 类型
 */
export interface NcWorkspace {
  id: string
  title: string
  meta?: string | Record<string, any>
  roles?: string
  created_at?: string
  updated_at?: string
}

/**
 * 活动页面类型
 */
export type ActivePage = 'workspace' | 'recent' | 'shared' | 'starred'

/**
 * Workspace 状态
 */
export interface WorkspaceState {
  workspaces: Map<string, NcWorkspace>
  collaborators: any[] | null
  allCollaborators: any[] | null
  isWorkspaceLoading: boolean
  isWorkspacesLoading: boolean
  isCollaboratorsLoading: boolean
  isInvitingCollaborators: boolean
  workspaceUserCount: number | undefined
  workspaceOwnerCount: number | undefined
  deletingWorkspace: boolean
  lastPopulatedWorkspaceId: string | null
  removingCollaboratorMap: Record<string, boolean>
}

/**
 * Workspace Getters
 */
export interface WorkspaceGetters {
  workspacesList: NcWorkspace[]
  activeWorkspaceId: string
  activeWorkspace: NcWorkspace | null
  activeWorkspaceMeta: Record<string, any>
  workspaceRole: string | undefined
  activePage: ActivePage
  isWorkspaceSettingsPageOpened: boolean
  isIntegrationsPageOpened: boolean
  isFeedPageOpened: boolean
}

/**
 * Workspace Actions
 */
export interface WorkspaceActions {
  loadWorkspaces: () => Promise<void>
  createWorkspace: (data: Partial<NcWorkspace>) => Promise<NcWorkspace | undefined>
  updateWorkspace: (id: string, data: Partial<NcWorkspace>) => Promise<void>
  deleteWorkspace: (id: string) => Promise<void>
  loadCollaborators: () => Promise<void>
  inviteCollaborator: (email: string, role: string) => Promise<void>
  removeCollaborator: (userId: string) => Promise<void>
  updateCollaborator: (userId: string, role: string) => Promise<void>
  loadWorkspace: (id: string) => Promise<void>
  populateWorkspace: () => Promise<void>
  clearWorkspaces: () => Promise<void>
  navigateToWorkspace: (workspaceId?: string) => Promise<void>
  navigateToWorkspaceSettings: (workspaceId?: string, cmdOrCtrl?: boolean) => Promise<void>
  navigateToIntegrations: (workspaceId?: string, cmdOrCtrl?: boolean, query?: Record<string, string>) => Promise<void>
  navigateToFeed: (workspaceId?: string, cmdOrCtrl?: boolean, query?: Record<string, string>) => Promise<void>
  setLoadingState: (isLoading: boolean) => void
  addToFavourite: (baseId: string) => Promise<void>
  removeFromFavourite: (baseId: string) => Promise<void>
  updateProjectTitle: (base: BaseType & { edit: boolean; temp_title: string }) => Promise<void>
  getPlanLimit: (arg: any) => number
}

/**
 * useWorkspace 返回类型
 */
export interface UseWorkspaceReturn extends WorkspaceState, WorkspaceGetters, WorkspaceActions {}
