import type { ViewType } from "nocodb-sdk"

export type ViewTypeString = "grid" | "gallery" | "form" | "kanban" | "calendar" | "map"

export interface CreateViewPayload {
  title: string
  type: ViewTypeString
  copy_from_id?: string
  fk_grp_col_id?: string | null
  fk_geo_data_col_id?: string | null
  fk_cover_image_col_id?: string | null
  calendar_range?: Array<{
    fk_from_column_id: string
    fk_to_column_id: string | null
  }>
}

export interface ViewsState {
  viewsByTable: Map<string, ViewType[]>
  activeViewId: string | null
  isViewsLoading: boolean
}

export interface ViewsActions {
  loadViews: (tableId: string, force?: boolean) => Promise<ViewType[] | undefined>
  getViewsForTable: (tableId: string) => ViewType[]
  getDefaultView: (tableId: string) => ViewType | undefined
  setActiveViewId: (viewId: string | null) => void
  createView: (tableId: string, payload: CreateViewPayload) => Promise<ViewType | null>
  updateView: (viewId: string, data: Partial<ViewType>) => Promise<ViewType | null>
  renameView: (viewId: string, title: string) => Promise<boolean>
  deleteView: (view: ViewType) => Promise<boolean>
  duplicateView: (view: ViewType) => Promise<ViewType | null>
  clearViewsForTable: (tableId: string) => void
}
