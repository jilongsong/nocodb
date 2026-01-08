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

// useWorkspace
export {
  useWorkspace,
  WorkspaceProvider,
} from './useWorkspace'

export type {
  NcWorkspace,
  ActivePage,
  UseWorkspaceReturn,
} from './useWorkspace/types'

// useBases
export {
  useBases,
  BasesProvider,
} from './useBases'

export type {
  NcProject,
  UseBasesReturn,
} from './useBases/types'

// useTables
export {
  useTables,
  TablesProvider,
} from './useTables'

export type {
  NcTable,
  UseTablesReturn,
} from './useTables/types'

// useViews
export { useViews, ViewsProvider } from "./useViews";
export type {
  ViewsState,
  ViewsActions,
  CreateViewPayload,
  ViewTypeString,
} from "./useViews/types";

export { useTableData, extractPkFromRow, rowDefaultData } from "./useTableData";
export type {
  Row,
  PaginationData,
  CellRange,
  ActiveCell,
  TableDataState,
  TableDataActions,
  LoadDataParams,
  UseTableDataOptions,
} from "./useTableData/types";

// useColumnWidth
export { useColumnWidth } from "./useColumnWidth";
export type { UseColumnWidthReturn } from "./useColumnWidth";

// useViewColumns
export { useViewColumns } from "./useViewColumns";
export type { UseViewColumnsReturn } from "./useViewColumns";

// useViewSorts
export { useViewSorts } from "./useViewSorts";
export type { UseViewSortsReturn } from "./useViewSorts";

// useViewFilters
export { useViewFilters } from "./useViewFilters";
export type { UseViewFiltersReturn, FilterCondition } from "./useViewFilters";

// useFormView
export { useFormView } from "./useFormView";
export type {
  FormColumnType,
  FormViewData,
  FormState,
  UseFormViewOptions,
  UseFormViewReturn,
} from "./useFormView";

// useAutomation
export { useAutomation, AutomationProvider } from "./useAutomation";
export type {
  Automation,
  AutomationTrigger,
  AutomationAction,
  AutomationLog,
  TriggerType,
  ActionType,
  TriggerConfig as AutomationTriggerConfig,
  ActionConfig as AutomationActionConfig,
  FilterGroup as AutomationFilterGroup,
  UseAutomationReturn,
  CreateAutomationRequest,
  UpdateAutomationRequest,
} from "./useAutomation/types";
