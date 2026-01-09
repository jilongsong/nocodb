
 "use client";

/**
 * 自动化系统类型定义
 * 参考飞书多维表格自动化设计
 */

// ==================== 触发器类型 ====================

export type TriggerType =
  | "record.created" // 记录创建
  | "record.updated" // 记录更新
  | "record.deleted" // 记录删除
  | "field.changed" // 特定字段变化
  | "button.clicked" // 按钮点击
  | "form.submitted" // 表单提交
  | "schedule.cron" // 定时触发 (Cron)
  | "schedule.interval" // 间隔触发
  | "webhook.received"; // 外部 Webhook

export interface TriggerConfig {
  // 字段变化触发器配置
  watch_fields?: string[];

  // 定时触发器配置
  cron_expression?: string;
  interval_minutes?: number;
  timezone?: string;

  // 表单触发器配置
  form_view_id?: string;

  // Webhook 触发器配置
  webhook_secret?: string;
  webhook_url?: string;
}

export interface AutomationTrigger {
  id: string;
  type: TriggerType;
  config: TriggerConfig;
  conditions?: FilterGroup;
}

// ==================== 动作类型 ====================

export type ActionType =
  | "record.create" // 创建新记录
  | "notification.email" // 发送邮件
  | "notification.webhook" // 调用 Webhook
  | "notification.slack" // 发送 Slack 消息
  | "notification.feishu" // 发送飞书消息
  | "notification.dingtalk" // 发送钉钉消息
  | "notification.wechat" // 发送企业微信消息
  | "script.run"; // 运行脚本

export type ActionErrorBehavior = "stop" | "continue" | "retry";

export interface FieldMapping {
  id: string;
  source_field_id?: string;
  target_field_id: string;
  value_type: "static" | "field" | "formula" | "variable";
  static_value?: string;
  formula?: string;
}

export interface ActionConfig {
  // 记录操作配置
  target_table_id?: string;
  field_mappings?: FieldMapping[];
  record_filter?: FilterGroup;

  // 通知操作配置
  recipients?: string[];
  subject_template?: string;
  body_template?: string;
  webhook_url?: string;
  webhook_method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  webhook_headers?: Record<string, string>;
  webhook_body_template?: string;

  // 脚本配置
  script_id?: string;
  script_params?: Record<string, unknown>;
}

export interface AutomationAction {
  id: string;
  type: ActionType;
  order: number;
  config: ActionConfig;
  on_error: ActionErrorBehavior;
  retry_count?: number;
  retry_delay_seconds?: number;
  next_action_id?: string;
}

// ==================== 条件/筛选类型 ====================

export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like"
  | "nlike"
  | "is_empty"
  | "is_not_empty"
  | "is_null"
  | "is_not_null"
  | "in"
  | "not_in"
  | "between"
  | "not_between";

export type FilterLogicalOperator = "and" | "or";

export interface FilterCondition {
  id: string;
  field_id: string;
  operator: FilterOperator;
  value?: unknown;
  value2?: unknown; // 用于 between 操作符
}

export interface FilterGroup {
  id: string;
  logical_op: FilterLogicalOperator;
  conditions: (FilterCondition | FilterGroup)[];
}

// ==================== 自动化主体类型 ====================

export type AutomationStatus = "active" | "inactive" | "error";

export interface Automation {
  id: string;
  title: string;
  description?: string;
  base_id: string;
  fk_model_id: string;
  fk_workspace_id?: string;
  status: AutomationStatus;
  is_active: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  last_run_at?: string;
  run_count: number;
  success_count: number;
  error_count: number;
  version?: number;
}

// ==================== 执行日志类型 ====================

export type ExecutionStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "skipped"
  | "cancelled";

export interface ActionLog {
  id: string;
  action_id: string;
  action_type: ActionType;
  status: ExecutionStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
}

export interface AutomationLog {
  id: string;
  automation_id: string;
  trigger_type: TriggerType;
  trigger_data?: Record<string, unknown>;
  status: ExecutionStatus;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  action_logs: ActionLog[];
  error?: string;
  triggered_by?: string;
  record_id?: string;
}

// ==================== API 请求/响应类型 ====================

export interface CreateAutomationRequest {
  title: string;
  description?: string;
  fk_model_id: string;
  trigger: Omit<AutomationTrigger, "id">;
  actions: Omit<AutomationAction, "id">[];
  is_active?: boolean;
}

export interface UpdateAutomationRequest {
  title?: string;
  description?: string;
  trigger?: Omit<AutomationTrigger, "id">;
  actions?: Omit<AutomationAction, "id">[];
  is_active?: boolean;
}

export interface AutomationListResponse {
  list: Automation[];
  pageInfo: {
    totalRows: number;
    page: number;
    pageSize: number;
    isFirstPage: boolean;
    isLastPage: boolean;
  };
}

export interface AutomationLogListResponse {
  list: AutomationLog[];
  pageInfo: {
    totalRows: number;
    page: number;
    pageSize: number;
    isFirstPage: boolean;
    isLastPage: boolean;
  };
}

export interface TestAutomationRequest {
  record_data?: Record<string, unknown>;
  dry_run?: boolean;
}

export interface TestAutomationResponse {
  success: boolean;
  log: AutomationLog;
  error?: string;
}

// ==================== Hook 状态类型 ====================

export interface AutomationState {
  automations: Map<string, Automation>;
  currentAutomation: Automation | null;
  automationLogs: Map<string, AutomationLog[]>;
  isLoading: boolean;
  isLoadingLogs: boolean;
  isSaving: boolean;
  error: string | null;
}

export interface AutomationActions {
  // 列表操作
  loadAutomations: (params: {
    baseId: string;
    tableId?: string;
    page?: number;
    pageSize?: number;
  }) => Promise<Automation[]>;

  // CRUD 操作 (所有操作都需要 baseId)
  loadAutomation: (baseId: string, id: string) => Promise<Automation | null>;
  createAutomation: (
    baseId: string,
    data: CreateAutomationRequest
  ) => Promise<Automation>;
  updateAutomation: (
    baseId: string,
    id: string,
    data: UpdateAutomationRequest
  ) => Promise<Automation>;
  deleteAutomation: (baseId: string, id: string) => Promise<void>;
  duplicateAutomation: (baseId: string, id: string) => Promise<Automation>;

  // 状态操作
  toggleActive: (baseId: string, id: string, active: boolean) => Promise<Automation>;

  // 测试操作
  testAutomation: (
    baseId: string,
    id: string,
    data?: TestAutomationRequest
  ) => Promise<TestAutomationResponse>;
  triggerAutomation: (baseId: string, id: string, recordId: string) => Promise<void>;

  // 日志操作
  loadAutomationLogs: (params: {
    baseId: string;
    automationId: string;
    page?: number;
    pageSize?: number;
  }) => Promise<AutomationLog[]>;

  // 状态管理
  setCurrentAutomation: (automation: Automation | null) => void;
  clearError: () => void;
  reset: () => void;
}

export interface UseAutomationReturn extends AutomationState, AutomationActions {
  // 计算属性
  automationsList: Automation[];
  activeAutomations: Automation[];
  tableAutomations: (tableId: string) => Automation[];
}

// ==================== 工作流节点类型 (用于可视化) ====================

export type WorkflowNodeType = "trigger" | "action" | "condition" | "placeholder";

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    nodeType: TriggerType | ActionType;
    config: TriggerConfig | ActionConfig;
    isSelected?: boolean;
    isValid?: boolean;
    errors?: string[];
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: "default" | "success" | "failure";
  animated?: boolean;
  label?: string;
}

// ==================== 模板变量类型 ====================

export interface TemplateVariable {
  name: string;
  label: string;
  type: "field" | "system" | "trigger" | "action_result";
  field_id?: string;
  action_id?: string;
  description?: string;
}

export interface TemplateContext {
  record: Record<string, unknown>;
  previous_record?: Record<string, unknown>;
  trigger: {
    type: TriggerType;
    timestamp: string;
    user?: { id: string; email: string; name?: string };
  };
  action_results: Record<string, unknown>;
  system: {
    now: string;
    base_id: string;
    table_id: string;
    automation_id: string;
  };
}
