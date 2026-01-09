import type {
  Automation,
  AutomationAction,
  AutomationTrigger,
  FilterGroup,
  FilterCondition,
  TriggerType,
  ActionType,
  ExecutionStatus,
} from "@/app/composables/useAutomation/types";

/**
 * 生成唯一 ID
 */
export function generateId(prefix: string = "id"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 解析模板中的变量
 * @param template 模板字符串，如 "Hello {record.name}"
 * @returns 变量名数组
 */
export function parseTemplateVariables(template: string): string[] {
  const regex = /\{([^}]+)\}/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(template)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

/**
 * 替换模板中的变量
 * @param template 模板字符串
 * @param context 变量上下文
 * @returns 替换后的字符串
 */
export function renderTemplate(
  template: string,
  context: Record<string, unknown>
): string {
  return template.replace(/\{([^}]+)\}/g, (match, path) => {
    const value = getNestedValue(context, path);
    if (value === undefined || value === null) {
      return match; // 保留原始变量
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  });
}

/**
 * 获取嵌套对象的值
 * @param obj 对象
 * @param path 路径，如 "record.user.name"
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * 设置嵌套对象的值
 */
export function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const keys = path.split(".");
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
}

/**
 * 验证 Cron 表达式
 */
export function isValidCronExpression(cron: string): boolean {
  // 简单验证：5 个或 6 个部分
  const parts = cron.trim().split(/\s+/);
  return parts.length >= 5 && parts.length <= 6;
}

/**
 * 解析 Cron 表达式为人类可读的描述
 */
export function describeCronExpression(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return "无效的 Cron 表达式";

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // 简单的常见模式匹配
  if (minute === "*" && hour === "*") {
    return "每分钟";
  }
  if (minute === "0" && hour === "*") {
    return "每小时";
  }
  if (minute === "0" && hour !== "*" && dayOfMonth === "*" && month === "*") {
    if (dayOfWeek === "*") {
      return `每天 ${hour}:00`;
    }
    if (dayOfWeek === "1-5") {
      return `工作日 ${hour}:00`;
    }
    if (dayOfWeek === "1") {
      return `每周一 ${hour}:00`;
    }
  }
  if (dayOfMonth === "1" && month === "*") {
    return `每月 1 日 ${hour}:${minute.padStart(2, "0")}`;
  }

  return cron;
}

/**
 * 验证邮箱地址
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * 验证 URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证自动化配置
 */
export function validateAutomation(automation: Partial<Automation>): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!automation.title?.trim()) {
    errors.title = "请输入自动化名称";
  }

  if (!automation.trigger?.type) {
    errors.trigger = "请选择触发器类型";
  }

  if (!automation.actions?.length) {
    errors.actions = "请至少添加一个动作";
  }

  // 验证触发器配置
  if (automation.trigger) {
    const triggerErrors = validateTrigger(automation.trigger);
    Object.assign(errors, triggerErrors);
  }

  // 验证动作配置
  automation.actions?.forEach((action, index) => {
    const actionErrors = validateAction(action);
    Object.entries(actionErrors).forEach(([key, value]) => {
      errors[`action_${index}_${key}`] = value;
    });
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * 验证触发器配置
 */
export function validateTrigger(
  trigger: AutomationTrigger
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (trigger.type === "schedule.cron") {
    if (!trigger.config.cron_expression) {
      errors.trigger_cron = "请输入 Cron 表达式";
    } else if (!isValidCronExpression(trigger.config.cron_expression)) {
      errors.trigger_cron = "无效的 Cron 表达式";
    }
  }

  if (trigger.type === "schedule.interval") {
    if (!trigger.config.interval_minutes || trigger.config.interval_minutes < 1) {
      errors.trigger_interval = "请输入有效的间隔时间";
    }
  }

  if (trigger.type === "field.changed") {
    if (!trigger.config.watch_fields?.length) {
      errors.trigger_fields = "请选择要监听的字段";
    }
  }

  return errors;
}

/**
 * 验证动作配置
 */
export function validateAction(action: AutomationAction): Record<string, string> {
  const errors: Record<string, string> = {};

  switch (action.type) {
    case "notification.email":
      if (!action.config.recipients?.length) {
        errors.recipients = "请输入收件人";
      } else {
        const invalidEmails = action.config.recipients.filter(
          (email) => !isValidEmail(email) && !email.includes("{")
        );
        if (invalidEmails.length) {
          errors.recipients = `无效的邮箱地址: ${invalidEmails.join(", ")}`;
        }
      }
      break;

    case "notification.webhook":
      if (!action.config.webhook_url) {
        errors.webhook_url = "请输入 Webhook URL";
      } else if (
        !isValidUrl(action.config.webhook_url) &&
        !action.config.webhook_url.includes("{")
      ) {
        errors.webhook_url = "无效的 URL";
      }
      break;

  }

  return errors;
}

/**
 * 评估筛选条件
 */
export function evaluateFilterCondition(
  condition: FilterCondition,
  record: Record<string, unknown>
): boolean {
  const fieldValue = record[condition.field_id];
  const compareValue = condition.value;

  switch (condition.operator) {
    case "eq":
      return fieldValue === compareValue;
    case "neq":
      return fieldValue !== compareValue;
    case "gt":
      return Number(fieldValue) > Number(compareValue);
    case "gte":
      return Number(fieldValue) >= Number(compareValue);
    case "lt":
      return Number(fieldValue) < Number(compareValue);
    case "lte":
      return Number(fieldValue) <= Number(compareValue);
    case "like":
      return String(fieldValue).includes(String(compareValue));
    case "nlike":
      return !String(fieldValue).includes(String(compareValue));
    case "is_empty":
      return fieldValue === "" || fieldValue === null || fieldValue === undefined;
    case "is_not_empty":
      return fieldValue !== "" && fieldValue !== null && fieldValue !== undefined;
    case "is_null":
      return fieldValue === null || fieldValue === undefined;
    case "is_not_null":
      return fieldValue !== null && fieldValue !== undefined;
    case "in":
      return Array.isArray(compareValue) && compareValue.includes(fieldValue);
    case "not_in":
      return !Array.isArray(compareValue) || !compareValue.includes(fieldValue);
    case "between":
      const min = Number(compareValue);
      const max = Number(condition.value2);
      const val = Number(fieldValue);
      return val >= min && val <= max;
    case "not_between":
      const min2 = Number(compareValue);
      const max2 = Number(condition.value2);
      const val2 = Number(fieldValue);
      return val2 < min2 || val2 > max2;
    default:
      return false;
  }
}

/**
 * 评估筛选条件组
 */
export function evaluateFilterGroup(
  group: FilterGroup,
  record: Record<string, unknown>
): boolean {
  if (!group.conditions.length) return true;

  const results = group.conditions.map((item) => {
    if ("conditions" in item) {
      // 嵌套条件组
      return evaluateFilterGroup(item as FilterGroup, record);
    }
    // 单个条件
    return evaluateFilterCondition(item as FilterCondition, record);
  });

  if (group.logical_op === "and") {
    return results.every(Boolean);
  }
  return results.some(Boolean);
}

/**
 * 格式化持续时间
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

/**
 * 格式化日期时间
 */
export function formatDateTime(date: string | Date, includeSeconds = false): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(includeSeconds && { second: "2-digit" }),
  };
  return d.toLocaleString("zh-CN", options);
}

/**
 * 深拷贝对象
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 创建默认触发器
 */
export function createDefaultTrigger(type: TriggerType = "record.created"): AutomationTrigger {
  return {
    id: generateId("trigger"),
    type,
    config: {},
  };
}

/**
 * 创建默认动作
 */
export function createDefaultAction(type: ActionType = "record.create"): AutomationAction {
  return {
    id: generateId("action"),
    type,
    order: 0,
    config: {},
    on_error: "stop",
  };
}

/**
 * 创建空自动化
 */
export function createEmptyAutomation(baseId: string, tableId: string): Partial<Automation> {
  return {
    title: "",
    description: "",
    base_id: baseId,
    fk_model_id: tableId,
    is_active: true,
    status: "inactive",
    trigger: createDefaultTrigger(),
    actions: [],
    run_count: 0,
    success_count: 0,
    error_count: 0,
  };
}

