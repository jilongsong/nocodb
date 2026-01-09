"use client";

/**
 * 接收人/用户选择系统类型定义
 * 支持多种用户来源：系统用户、表格字段、变量
 */

// ==================== 接收人来源类型 ====================

export type RecipientSourceType =
  | "static"           // 手动输入的邮箱
  | "system_user"      // 系统用户（工作区成员）
  | "table_field"      // 表格字段（用户/邮箱类型）
  | "variable"         // 变量（从前置动作获取）
  | "trigger_user";    // 触发用户

// ==================== 接收人定义 ====================

export interface Recipient {
  id: string;
  type: RecipientSourceType;
  value: string;                    // 实际值：邮箱、用户ID、字段ID、变量路径
  label?: string;                   // 显示名称
  avatar?: string;                  // 头像 URL
  metadata?: RecipientMetadata;     // 额外信息
}

export interface RecipientMetadata {
  // 系统用户信息
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  
  // 表格字段信息
  fieldId?: string;
  fieldTitle?: string;
  tableId?: string;
  tableName?: string;
  
  // 变量信息
  variablePath?: string;
  sourceActionId?: string;
  sourceActionLabel?: string;
}

// ==================== 系统用户 ====================

export interface SystemUser {
  id: string;
  email: string;
  display_name?: string;
  avatar?: string;
  roles?: string;
  invite_token?: string;
  created_at?: string;
}

// ==================== 表格用户字段 ====================

export interface TableUserField {
  fieldId: string;
  fieldTitle: string;
  tableId: string;
  tableName: string;
  fieldType: "user" | "email" | "collaborator";
  isMultiple?: boolean;
}

// ==================== 接收人选择器配置 ====================

export interface RecipientPickerConfig {
  // 允许的来源类型
  allowedSources?: RecipientSourceType[];
  // 是否支持多选
  multiple?: boolean;
  // 最大选择数量
  maxCount?: number;
  // 是否允许手动输入邮箱
  allowManualInput?: boolean;
  // 当前表格 ID
  tableId?: string;
  // Base ID
  baseId?: string;
  // 可用的系统用户
  systemUsers?: SystemUser[];
  // 可用的用户字段
  userFields?: TableUserField[];
  // 可用的变量（来自前置动作）
  availableVariables?: RecipientVariable[];
  // 占位符文本
  placeholder?: string;
}

// ==================== 变量接收人 ====================

export interface RecipientVariable {
  variablePath: string;
  label: string;
  description?: string;
  sourceActionId?: string;
  sourceActionLabel?: string;
  dataType: "string" | "array" | "user";
}

// ==================== 接收人验证 ====================

export interface RecipientValidation {
  valid: boolean;
  error?: string;
  resolvedCount?: number;
}

export function validateRecipient(recipient: Recipient): RecipientValidation {
  switch (recipient.type) {
    case "static":
      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipient.value)) {
        return { valid: false, error: "无效的邮箱格式" };
      }
      return { valid: true };
      
    case "system_user":
      if (!recipient.value) {
        return { valid: false, error: "请选择用户" };
      }
      return { valid: true };
      
    case "table_field":
      if (!recipient.value) {
        return { valid: false, error: "请选择字段" };
      }
      return { valid: true };
      
    case "variable":
      if (!recipient.value) {
        return { valid: false, error: "请选择变量" };
      }
      return { valid: true };
      
    case "trigger_user":
      return { valid: true };
      
    default:
      return { valid: false, error: "未知的接收人类型" };
  }
}

// ==================== 接收人序列化/反序列化 ====================

export function serializeRecipient(recipient: Recipient): string {
  switch (recipient.type) {
    case "static":
      return recipient.value;
    case "system_user":
      return `{{user:${recipient.value}}}`;
    case "table_field":
      return `{{field:${recipient.value}}}`;
    case "variable":
      return `{{${recipient.value}}}`;
    case "trigger_user":
      return "{{trigger.user.email}}";
    default:
      return recipient.value;
  }
}

export function deserializeRecipient(value: string): Recipient {
  // 触发用户
  if (value === "{{trigger.user.email}}") {
    return {
      id: `recipient-trigger-user`,
      type: "trigger_user",
      value: "trigger.user.email",
      label: "触发用户",
    };
  }
  
  // 系统用户
  const userMatch = value.match(/^\{\{user:(.+)\}\}$/);
  if (userMatch) {
    return {
      id: `recipient-user-${userMatch[1]}`,
      type: "system_user",
      value: userMatch[1],
    };
  }
  
  // 表格字段
  const fieldMatch = value.match(/^\{\{field:(.+)\}\}$/);
  if (fieldMatch) {
    return {
      id: `recipient-field-${fieldMatch[1]}`,
      type: "table_field",
      value: fieldMatch[1],
    };
  }
  
  // 变量
  const varMatch = value.match(/^\{\{(.+)\}\}$/);
  if (varMatch) {
    return {
      id: `recipient-var-${varMatch[1]}`,
      type: "variable",
      value: varMatch[1],
    };
  }
  
  // 静态邮箱
  return {
    id: `recipient-static-${value}`,
    type: "static",
    value,
    label: value,
  };
}

// ==================== 接收人列表序列化 ====================

export function serializeRecipients(recipients: Recipient[]): string[] {
  return recipients.map(serializeRecipient);
}

export function deserializeRecipients(values: string[]): Recipient[] {
  return values.map(deserializeRecipient);
}

// ==================== 接收人来源标签 ====================

export const RECIPIENT_SOURCE_LABELS: Record<RecipientSourceType, string> = {
  static: "手动输入",
  system_user: "系统用户",
  table_field: "表格字段",
  variable: "变量",
  trigger_user: "触发用户",
};

export const RECIPIENT_SOURCE_DESCRIPTIONS: Record<RecipientSourceType, string> = {
  static: "手动输入邮箱地址",
  system_user: "从工作区成员中选择",
  table_field: "从表格的用户或邮箱字段获取",
  variable: "从前置动作的结果中获取",
  trigger_user: "发送给触发自动化的用户",
};

// ==================== 创建接收人 ====================

let recipientIdCounter = 0;

export function createRecipient(
  type: RecipientSourceType,
  value: string,
  label?: string,
  metadata?: RecipientMetadata
): Recipient {
  return {
    id: `recipient-${Date.now()}-${++recipientIdCounter}`,
    type,
    value,
    label,
    metadata,
  };
}

export function createStaticRecipient(email: string): Recipient {
  return createRecipient("static", email, email);
}

export function createSystemUserRecipient(user: SystemUser): Recipient {
  return createRecipient("system_user", user.id, user.display_name || user.email, {
    userId: user.id,
    userName: user.display_name,
    userEmail: user.email,
  });
}

export function createTableFieldRecipient(field: TableUserField): Recipient {
  return createRecipient("table_field", field.fieldId, field.fieldTitle, {
    fieldId: field.fieldId,
    fieldTitle: field.fieldTitle,
    tableId: field.tableId,
    tableName: field.tableName,
  });
}

export function createVariableRecipient(
  variablePath: string,
  label: string,
  sourceActionId?: string,
  sourceActionLabel?: string
): Recipient {
  return createRecipient("variable", variablePath, label, {
    variablePath,
    sourceActionId,
    sourceActionLabel,
  });
}

export function createTriggerUserRecipient(): Recipient {
  return createRecipient("trigger_user", "trigger.user.email", "触发用户");
}
