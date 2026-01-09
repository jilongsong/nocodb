"use client";

/**
 * 增强变量系统类型定义
 * 参考飞书多维表格和 Zapier 的最佳实践
 */

// ==================== 变量来源类型 ====================

export type VariableSourceType =
  | "trigger"           // 触发器数据
  | "record"            // 当前记录字段
  | "previous_record"   // 更新前的记录
  | "action_result"     // 前置动作结果
  | "system"            // 系统变量
  | "loop"              // 循环上下文
  | "custom";           // 自定义变量

// ==================== 变量定义 ====================

export interface VariableDefinition {
  id: string;
  name: string;                    // 变量路径，如 "action_results.http_1.response.data"
  label: string;                   // 显示名称
  description?: string;            // 描述
  source: VariableSourceType;      // 来源类型
  dataType: VariableDataType;      // 数据类型
  schema?: VariableSchema;         // 数据结构（用于对象/数组）
  sourceActionId?: string;         // 来源动作 ID（用于 action_result）
  sourceActionLabel?: string;      // 来源动作名称
  example?: unknown;               // 示例值
  isArray?: boolean;               // 是否是数组
}

export type VariableDataType = 
  | "string" 
  | "number" 
  | "boolean" 
  | "date" 
  | "datetime"
  | "object" 
  | "array" 
  | "any"
  | "user"
  | "email"
  | "url";

export interface VariableSchema {
  type: VariableDataType;
  properties?: Record<string, VariableSchema>;
  items?: VariableSchema;
  description?: string;
}

// ==================== 变量选择器配置 ====================

export interface VariablePickerConfig {
  // 允许的变量来源
  allowedSources?: VariableSourceType[];
  // 允许的数据类型
  allowedTypes?: VariableDataType[];
  // 是否显示动作结果
  showActionResults?: boolean;
  // 可用的动作结果
  availableActionResults?: ActionResultVariable[];
  // 是否在循环内
  isInsideLoop?: boolean;
  // 触发器类型（用于显示特定变量）
  triggerType?: string;
  // 当前表格字段
  fields?: FieldDefinition[];
  // 是否支持深度路径选择
  allowDeepPath?: boolean;
  // 是否支持数组索引
  allowArrayIndex?: boolean;
}

export interface FieldDefinition {
  id: string;
  title: string;
  type: string;
  uidt?: string;
}

// ==================== 动作结果变量 ====================

export interface ActionResultVariable {
  actionId: string;
  actionLabel: string;
  actionType: string;
  actionOrder: number;
  outputSchema: ActionOutputSchema;
}

export interface ActionOutputSchema {
  type: "object" | "array" | "primitive";
  properties?: Record<string, OutputPropertySchema>;
  items?: OutputPropertySchema;
  description?: string;
}

export interface OutputPropertySchema {
  type: VariableDataType;
  label: string;
  description?: string;
  path: string;
  properties?: Record<string, OutputPropertySchema>;
  items?: OutputPropertySchema;
  example?: unknown;
}

// ==================== HTTP 动作输出 Schema ====================

export const HTTP_ACTION_OUTPUT_SCHEMA: ActionOutputSchema = {
  type: "object",
  description: "HTTP 请求响应",
  properties: {
    status: {
      type: "number",
      label: "状态码",
      path: "status",
      description: "HTTP 响应状态码",
      example: 200,
    },
    statusText: {
      type: "string",
      label: "状态文本",
      path: "statusText",
      description: "HTTP 响应状态文本",
      example: "OK",
    },
    headers: {
      type: "object",
      label: "响应头",
      path: "headers",
      description: "HTTP 响应头",
    },
    data: {
      type: "any",
      label: "响应数据",
      path: "data",
      description: "HTTP 响应体（自动解析 JSON）",
    },
  },
};

// ==================== 记录创建动作输出 Schema ====================

export const RECORD_CREATE_OUTPUT_SCHEMA: ActionOutputSchema = {
  type: "object",
  description: "创建的记录",
  properties: {
    created: {
      type: "boolean",
      label: "是否创建成功",
      path: "created",
      example: true,
    },
    record: {
      type: "object",
      label: "创建的记录",
      path: "record",
      description: "新创建的记录数据",
    },
  },
};

// ==================== 获取动作输出 Schema ====================

export function getActionOutputSchema(actionType: string): ActionOutputSchema {
  switch (actionType) {
    case "notification.webhook":
    case "notification.feishu":
    case "notification.dingtalk":
    case "notification.wechat":
    case "notification.slack":
    case "http.request":
      return HTTP_ACTION_OUTPUT_SCHEMA;
    case "record.create":
      return RECORD_CREATE_OUTPUT_SCHEMA;
    default:
      return { type: "object", properties: {} };
  }
}

// ==================== 变量转换器 ====================

export type TransformerType =
  | "uppercase"
  | "lowercase"
  | "trim"
  | "substring"
  | "replace"
  | "split"
  | "join"
  | "length"
  | "first"
  | "last"
  | "at"
  | "default"
  | "format_date"
  | "format_number"
  | "to_json"
  | "from_json"
  | "math";

export interface VariableTransformer {
  type: TransformerType;
  params?: Record<string, unknown>;
}

export interface TransformerDefinition {
  type: TransformerType;
  label: string;
  description: string;
  inputTypes: VariableDataType[];
  outputType: VariableDataType;
  params?: TransformerParamDefinition[];
}

export interface TransformerParamDefinition {
  name: string;
  label: string;
  type: "string" | "number" | "boolean";
  required?: boolean;
  default?: unknown;
}

export const TRANSFORMER_DEFINITIONS: TransformerDefinition[] = [
  {
    type: "uppercase",
    label: "转大写",
    description: "将文本转换为大写",
    inputTypes: ["string"],
    outputType: "string",
  },
  {
    type: "lowercase",
    label: "转小写",
    description: "将文本转换为小写",
    inputTypes: ["string"],
    outputType: "string",
  },
  {
    type: "trim",
    label: "去除空格",
    description: "去除首尾空格",
    inputTypes: ["string"],
    outputType: "string",
  },
  {
    type: "substring",
    label: "截取文本",
    description: "截取文本的一部分",
    inputTypes: ["string"],
    outputType: "string",
    params: [
      { name: "start", label: "开始位置", type: "number", required: true, default: 0 },
      { name: "end", label: "结束位置", type: "number", required: false },
    ],
  },
  {
    type: "replace",
    label: "替换文本",
    description: "替换文本中的内容",
    inputTypes: ["string"],
    outputType: "string",
    params: [
      { name: "search", label: "查找", type: "string", required: true },
      { name: "replace", label: "替换为", type: "string", required: true },
    ],
  },
  {
    type: "split",
    label: "分割文本",
    description: "按分隔符分割为数组",
    inputTypes: ["string"],
    outputType: "array",
    params: [
      { name: "separator", label: "分隔符", type: "string", required: true, default: "," },
    ],
  },
  {
    type: "join",
    label: "连接数组",
    description: "将数组连接为文本",
    inputTypes: ["array"],
    outputType: "string",
    params: [
      { name: "separator", label: "分隔符", type: "string", required: false, default: "," },
    ],
  },
  {
    type: "length",
    label: "获取长度",
    description: "获取文本或数组的长度",
    inputTypes: ["string", "array"],
    outputType: "number",
  },
  {
    type: "first",
    label: "第一项",
    description: "获取数组的第一项",
    inputTypes: ["array"],
    outputType: "any",
  },
  {
    type: "last",
    label: "最后一项",
    description: "获取数组的最后一项",
    inputTypes: ["array"],
    outputType: "any",
  },
  {
    type: "at",
    label: "指定索引",
    description: "获取数组指定位置的项",
    inputTypes: ["array"],
    outputType: "any",
    params: [
      { name: "index", label: "索引", type: "number", required: true, default: 0 },
    ],
  },
  {
    type: "default",
    label: "默认值",
    description: "当值为空时使用默认值",
    inputTypes: ["any"],
    outputType: "any",
    params: [
      { name: "value", label: "默认值", type: "string", required: true },
    ],
  },
  {
    type: "format_date",
    label: "格式化日期",
    description: "格式化日期时间",
    inputTypes: ["date", "datetime", "string"],
    outputType: "string",
    params: [
      { name: "format", label: "格式", type: "string", required: true, default: "YYYY-MM-DD" },
    ],
  },
  {
    type: "format_number",
    label: "格式化数字",
    description: "格式化数字",
    inputTypes: ["number"],
    outputType: "string",
    params: [
      { name: "decimals", label: "小数位数", type: "number", required: false, default: 2 },
      { name: "separator", label: "千分位分隔符", type: "string", required: false, default: "," },
    ],
  },
  {
    type: "to_json",
    label: "转为 JSON",
    description: "将对象转换为 JSON 字符串",
    inputTypes: ["object", "array"],
    outputType: "string",
  },
  {
    type: "from_json",
    label: "解析 JSON",
    description: "将 JSON 字符串解析为对象",
    inputTypes: ["string"],
    outputType: "object",
  },
];

// ==================== 变量表达式 ====================

export interface VariableExpression {
  variable: string;                    // 变量路径
  transformers?: VariableTransformer[]; // 转换器链
  fallback?: string;                   // 默认值
}

// 解析变量表达式: {{variable.path | transformer1 | transformer2 | default: "fallback"}}
export function parseVariableExpression(expr: string): VariableExpression | null {
  const match = expr.match(/^\{\{(.+?)\}\}$/);
  if (!match) return null;

  const content = match[1].trim();
  const parts = content.split("|").map((p) => p.trim());
  
  if (parts.length === 0) return null;

  const variable = parts[0];
  const transformers: VariableTransformer[] = [];
  let fallback: string | undefined;

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith("default:")) {
      fallback = part.substring(8).trim().replace(/^["']|["']$/g, "");
    } else {
      const [type, ...params] = part.split(":");
      transformers.push({
        type: type.trim() as TransformerType,
        params: params.length > 0 ? { value: params.join(":").trim() } : undefined,
      });
    }
  }

  return { variable, transformers, fallback };
}

// 构建变量表达式
export function buildVariableExpression(expr: VariableExpression): string {
  let result = `{{${expr.variable}`;
  
  if (expr.transformers?.length) {
    for (const t of expr.transformers) {
      result += ` | ${t.type}`;
      if (t.params) {
        const paramStr = Object.values(t.params).join(":");
        if (paramStr) result += `:${paramStr}`;
      }
    }
  }
  
  if (expr.fallback) {
    result += ` | default: "${expr.fallback}"`;
  }
  
  result += "}}";
  return result;
}

// ==================== 变量分类 ====================

export interface VariableCategory {
  id: string;
  label: string;
  icon: string;
  description?: string;
  variables: VariableDefinition[];
}

// 构建系统变量
export function getSystemVariables(): VariableDefinition[] {
  return [
    {
      id: "system.now",
      name: "system.now",
      label: "当前时间",
      description: "自动化执行时的时间戳 (ISO 8601)",
      source: "system",
      dataType: "datetime",
      example: "2024-01-15T10:30:00.000Z",
    },
    {
      id: "system.today",
      name: "system.today",
      label: "今天日期",
      description: "当天日期 (YYYY-MM-DD)",
      source: "system",
      dataType: "date",
      example: "2024-01-15",
    },
    {
      id: "system.base_id",
      name: "system.base_id",
      label: "Base ID",
      description: "当前 Base 的唯一标识",
      source: "system",
      dataType: "string",
    },
    {
      id: "system.table_id",
      name: "system.table_id",
      label: "表格 ID",
      description: "当前表格的唯一标识",
      source: "system",
      dataType: "string",
    },
    {
      id: "system.automation_id",
      name: "system.automation_id",
      label: "自动化 ID",
      description: "当前自动化的唯一标识",
      source: "system",
      dataType: "string",
    },
    {
      id: "system.execution_id",
      name: "system.execution_id",
      label: "执行 ID",
      description: "本次执行的唯一标识",
      source: "system",
      dataType: "string",
    },
  ];
}

// 构建触发器变量
export function getTriggerVariables(triggerType?: string): VariableDefinition[] {
  const base: VariableDefinition[] = [
    {
      id: "trigger.type",
      name: "trigger.type",
      label: "触发类型",
      description: "触发自动化的事件类型",
      source: "trigger",
      dataType: "string",
    },
    {
      id: "trigger.timestamp",
      name: "trigger.timestamp",
      label: "触发时间",
      description: "触发发生的时间",
      source: "trigger",
      dataType: "datetime",
    },
    {
      id: "trigger.user.id",
      name: "trigger.user.id",
      label: "触发用户 ID",
      description: "触发自动化的用户 ID",
      source: "trigger",
      dataType: "string",
    },
    {
      id: "trigger.user.email",
      name: "trigger.user.email",
      label: "触发用户邮箱",
      description: "触发自动化的用户邮箱",
      source: "trigger",
      dataType: "email",
    },
    {
      id: "trigger.user.name",
      name: "trigger.user.name",
      label: "触发用户名称",
      description: "触发自动化的用户名称",
      source: "trigger",
      dataType: "string",
    },
  ];

  // 如果是 webhook 触发器，添加请求相关变量
  if (triggerType === "webhook.received") {
    base.push(
      {
        id: "trigger.request.method",
        name: "trigger.request.method",
        label: "请求方法",
        description: "HTTP 请求方法",
        source: "trigger",
        dataType: "string",
        example: "POST",
      },
      {
        id: "trigger.request.headers",
        name: "trigger.request.headers",
        label: "请求头",
        description: "HTTP 请求头",
        source: "trigger",
        dataType: "object",
      },
      {
        id: "trigger.request.body",
        name: "trigger.request.body",
        label: "请求体",
        description: "HTTP 请求体",
        source: "trigger",
        dataType: "object",
      },
      {
        id: "trigger.request.query",
        name: "trigger.request.query",
        label: "查询参数",
        description: "URL 查询参数",
        source: "trigger",
        dataType: "object",
      }
    );
  }

  return base;
}

// 构建循环上下文变量
export function getLoopVariables(): VariableDefinition[] {
  return [
    {
      id: "loop.index",
      name: "loop.index",
      label: "循环索引",
      description: "当前循环的索引 (从 0 开始)",
      source: "loop",
      dataType: "number",
      example: 0,
    },
    {
      id: "loop.index1",
      name: "loop.index1",
      label: "循环序号",
      description: "当前循环的序号 (从 1 开始)",
      source: "loop",
      dataType: "number",
      example: 1,
    },
    {
      id: "loop.item",
      name: "loop.item",
      label: "当前项",
      description: "当前循环迭代的项目",
      source: "loop",
      dataType: "any",
    },
    {
      id: "loop.first",
      name: "loop.first",
      label: "是否第一项",
      description: "是否为循环的第一次迭代",
      source: "loop",
      dataType: "boolean",
    },
    {
      id: "loop.last",
      name: "loop.last",
      label: "是否最后一项",
      description: "是否为循环的最后一次迭代",
      source: "loop",
      dataType: "boolean",
    },
    {
      id: "loop.length",
      name: "loop.length",
      label: "总循环次数",
      description: "循环的总次数",
      source: "loop",
      dataType: "number",
    },
  ];
}

// 从字段定义构建记录变量
export function getRecordVariables(fields: FieldDefinition[]): VariableDefinition[] {
  return fields.map((field) => ({
    id: `record.${field.id}`,
    name: `record.${field.id}`,
    label: field.title,
    description: `字段值 (${field.type})`,
    source: "record" as VariableSourceType,
    dataType: mapFieldTypeToVariableType(field.type, field.uidt),
  }));
}

// 映射字段类型到变量类型
function mapFieldTypeToVariableType(type: string, uidt?: string): VariableDataType {
  const t = (uidt || type).toLowerCase();
  if (["email"].includes(t)) return "email";
  if (["url", "link"].includes(t)) return "url";
  if (["number", "decimal", "currency", "percent", "rating", "duration"].includes(t)) return "number";
  if (["date"].includes(t)) return "date";
  if (["datetime", "createdat", "updatedat"].includes(t)) return "datetime";
  if (["checkbox", "boolean"].includes(t)) return "boolean";
  if (["user", "collaborator"].includes(t)) return "user";
  if (["json", "object"].includes(t)) return "object";
  if (["multiselect", "attachment", "linktoanotherrecord", "lookup", "rollup"].includes(t)) return "array";
  return "string";
}

// 从动作结果构建变量
export function getActionResultVariables(
  actions: ActionResultVariable[],
  currentActionOrder: number
): VariableDefinition[] {
  const result: VariableDefinition[] = [];
  
  for (const action of actions) {
    // 只显示当前动作之前的动作结果
    if (action.actionOrder >= currentActionOrder) continue;
    
    const schema = action.outputSchema;
    const basePath = `action_results.${action.actionId}`;
    
    // 添加根结果
    result.push({
      id: basePath,
      name: basePath,
      label: `${action.actionLabel} 结果`,
      description: schema.description,
      source: "action_result",
      dataType: "object",
      sourceActionId: action.actionId,
      sourceActionLabel: action.actionLabel,
    });
    
    // 展开属性
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        result.push({
          id: `${basePath}.${prop.path}`,
          name: `${basePath}.${prop.path}`,
          label: `${action.actionLabel} → ${prop.label}`,
          description: prop.description,
          source: "action_result",
          dataType: prop.type,
          sourceActionId: action.actionId,
          sourceActionLabel: action.actionLabel,
          example: prop.example,
        });
        
        // 如果是 data 属性，添加提示可以继续访问子属性
        if (key === "data" && prop.type === "any") {
          result.push({
            id: `${basePath}.data.*`,
            name: `${basePath}.data.`,
            label: `${action.actionLabel} → 响应数据字段`,
            description: "输入响应数据中的字段路径，如 data.users[0].name",
            source: "action_result",
            dataType: "any",
            sourceActionId: action.actionId,
            sourceActionLabel: action.actionLabel,
          });
        }
      }
    }
  }
  
  return result;
}
