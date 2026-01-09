import { Injectable, Logger } from '@nestjs/common';
import * as jp from 'jsonpath';

/**
 * 增强变量解析服务
 * 支持:
 * - 深度路径访问: action_results.http_1.response.data.users[0].name
 * - JSONPath 查询: action_results.http_1.response.data[?(@.status=='active')]
 * - 变量转换器: {{variable | uppercase | default: "N/A"}}
 * - 多种数据类型处理
 */

export interface VariableContext {
  record: Record<string, any>;
  previous_record?: Record<string, any>;
  trigger: {
    type: string;
    timestamp: string;
    user?: { id: string; email: string; name?: string };
    request?: {
      method?: string;
      headers?: Record<string, string>;
      body?: any;
      query?: Record<string, string>;
    };
  };
  action_results: Record<string, ActionResult>;
  system: {
    now: string;
    today: string;
    base_id: string;
    table_id: string;
    automation_id: string;
    execution_id: string;
  };
  loop?: {
    index: number;
    index1: number;
    item: any;
    first: boolean;
    last: boolean;
    length: number;
  };
  custom?: Record<string, any>;
}

export interface ActionResult {
  success: boolean;
  output?: any;
  error?: string;
  // HTTP 响应特有字段
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  data?: any;
}

export type TransformerType =
  | 'uppercase'
  | 'lowercase'
  | 'trim'
  | 'substring'
  | 'replace'
  | 'split'
  | 'join'
  | 'length'
  | 'first'
  | 'last'
  | 'at'
  | 'default'
  | 'format_date'
  | 'format_number'
  | 'to_json'
  | 'from_json'
  | 'extract'
  | 'map'
  | 'filter'
  | 'pluck';

export interface Transformer {
  type: TransformerType;
  params?: Record<string, any>;
}

export interface ParsedExpression {
  variable: string;
  transformers: Transformer[];
  fallback?: string;
  isJsonPath?: boolean;
}

@Injectable()
export class AutomationVariableService {
  private readonly logger = new Logger(AutomationVariableService.name);

  /**
   * 解析模板字符串，支持多种变量格式
   * - {{variable.path}}
   * - {{variable.path | transformer}}
   * - {{variable.path | default: "fallback"}}
   * - {variable.path} (简化格式)
   */
  resolveTemplate(template: string, context: VariableContext): string {
    if (!template) return '';

    // 处理双花括号格式 {{...}}
    let result = template.replace(/\{\{([^}]+)\}\}/g, (match, content) => {
      const parsed = this.parseExpression(content.trim());
      const value = this.resolveExpression(parsed, context);
      return value !== undefined && value !== null ? String(value) : match;
    });

    // 处理单花括号格式 {...} (向后兼容)
    result = result.replace(/\{([^{}]+)\}/g, (match, path) => {
      // 避免处理已经被处理过的内容
      if (path.includes('|')) return match;
      const value = this.resolveVariable(path.trim(), context);
      return value !== undefined && value !== null ? String(value) : match;
    });

    return result;
  }

  /**
   * 解析变量表达式
   */
  parseExpression(expr: string): ParsedExpression {
    const parts = expr.split('|').map((p) => p.trim());
    const variablePart = parts[0];
    const transformers: Transformer[] = [];
    let fallback: string | undefined;
    let isJsonPath = false;

    // 检查是否是 JSONPath 表达式
    if (variablePart.includes('[?') || variablePart.includes('[*]')) {
      isJsonPath = true;
    }

    // 解析转换器
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      
      // 检查默认值
      if (part.startsWith('default:')) {
        fallback = part.substring(8).trim().replace(/^["']|["']$/g, '');
        continue;
      }

      // 解析转换器及其参数
      const colonIndex = part.indexOf(':');
      if (colonIndex > -1) {
        const type = part.substring(0, colonIndex).trim() as TransformerType;
        const paramStr = part.substring(colonIndex + 1).trim();
        transformers.push({
          type,
          params: this.parseTransformerParams(type, paramStr),
        });
      } else {
        transformers.push({ type: part as TransformerType });
      }
    }

    return {
      variable: variablePart,
      transformers,
      fallback,
      isJsonPath,
    };
  }

  /**
   * 解析转换器参数
   */
  private parseTransformerParams(type: TransformerType, paramStr: string): Record<string, any> {
    const params: Record<string, any> = {};
    
    // 移除引号
    const cleanValue = paramStr.replace(/^["']|["']$/g, '');

    switch (type) {
      case 'substring':
        const [start, end] = cleanValue.split(',').map((s) => parseInt(s.trim(), 10));
        params.start = start;
        if (!isNaN(end)) params.end = end;
        break;
      case 'replace':
        const [search, replace] = cleanValue.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
        params.search = search;
        params.replace = replace;
        break;
      case 'split':
      case 'join':
        params.separator = cleanValue;
        break;
      case 'at':
        params.index = parseInt(cleanValue, 10);
        break;
      case 'format_date':
        params.format = cleanValue;
        break;
      case 'format_number':
        const [decimals, separator] = cleanValue.split(',').map((s) => s.trim());
        params.decimals = parseInt(decimals, 10) || 2;
        params.separator = separator?.replace(/^["']|["']$/g, '') || ',';
        break;
      case 'pluck':
      case 'extract':
        params.path = cleanValue;
        break;
      case 'filter':
        params.condition = cleanValue;
        break;
      default:
        params.value = cleanValue;
    }

    return params;
  }

  /**
   * 解析表达式并返回值
   */
  resolveExpression(parsed: ParsedExpression, context: VariableContext): any {
    let value: any;

    // 解析变量值
    if (parsed.isJsonPath) {
      value = this.resolveJsonPath(parsed.variable, context);
    } else {
      value = this.resolveVariable(parsed.variable, context);
    }

    // 应用转换器
    for (const transformer of parsed.transformers) {
      value = this.applyTransformer(value, transformer);
    }

    // 应用默认值
    if ((value === undefined || value === null || value === '') && parsed.fallback !== undefined) {
      value = parsed.fallback;
    }

    return value;
  }

  /**
   * 解析变量路径
   * 支持: record.field, action_results.action_id.data.path, system.now
   */
  resolveVariable(path: string, context: VariableContext): any {
    const parts = path.split('.');
    let current: any = context;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      if (current === undefined || current === null) {
        return undefined;
      }

      // 处理数组索引: field[0], field[1]
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, key, indexStr] = arrayMatch;
        const index = parseInt(indexStr, 10);
        current = current[key];
        if (Array.isArray(current)) {
          current = current[index];
        } else {
          return undefined;
        }
      } else {
        current = current[part];
      }
    }

    return current;
  }

  /**
   * 使用 JSONPath 解析复杂路径
   */
  resolveJsonPath(pathExpr: string, context: VariableContext): any {
    try {
      // 将点号路径转换为 JSONPath
      const jsonPath = pathExpr.startsWith('$') ? pathExpr : `$.${pathExpr}`;
      const results = jp.query(context, jsonPath);
      
      // 如果只有一个结果，返回单值
      if (results.length === 1) {
        return results[0];
      }
      return results.length > 0 ? results : undefined;
    } catch (error) {
      this.logger.warn(`JSONPath query failed: ${pathExpr}`, error);
      // 回退到普通路径解析
      return this.resolveVariable(pathExpr, context);
    }
  }

  /**
   * 应用转换器
   */
  applyTransformer(value: any, transformer: Transformer): any {
    if (value === undefined || value === null) {
      // 某些转换器可以处理 null/undefined
      if (transformer.type === 'default') {
        return transformer.params?.value;
      }
      return value;
    }

    const { type, params } = transformer;

    switch (type) {
      // 字符串转换器
      case 'uppercase':
        return String(value).toUpperCase();
      
      case 'lowercase':
        return String(value).toLowerCase();
      
      case 'trim':
        return String(value).trim();
      
      case 'substring':
        return String(value).substring(params?.start || 0, params?.end);
      
      case 'replace':
        if (!params?.search) return value;
        return String(value).replace(new RegExp(params.search, 'g'), params.replace || '');
      
      case 'split':
        return String(value).split(params?.separator || ',');
      
      // 数组转换器
      case 'join':
        if (!Array.isArray(value)) return value;
        return value.join(params?.separator || ',');
      
      case 'length':
        if (Array.isArray(value)) return value.length;
        return String(value).length;
      
      case 'first':
        if (Array.isArray(value)) return value[0];
        return value;
      
      case 'last':
        if (Array.isArray(value)) return value[value.length - 1];
        return value;
      
      case 'at':
        if (Array.isArray(value)) {
          const index = params?.index || 0;
          return value[index >= 0 ? index : value.length + index];
        }
        return value;
      
      case 'pluck':
        if (Array.isArray(value) && params?.path) {
          return value.map((item) => this.getNestedValue(item, params.path));
        }
        return value;
      
      case 'filter':
        if (Array.isArray(value) && params?.condition) {
          return value.filter((item) => this.evaluateCondition(item, params.condition));
        }
        return value;
      
      case 'map':
        if (Array.isArray(value) && params?.path) {
          return value.map((item) => this.getNestedValue(item, params.path));
        }
        return value;
      
      case 'extract':
        if (params?.path) {
          return this.getNestedValue(value, params.path);
        }
        return value;
      
      // 日期转换器
      case 'format_date':
        try {
          const date = new Date(value);
          const format = params?.format || 'YYYY-MM-DD';
          return this.formatDate(date, format);
        } catch {
          return value;
        }
      
      // 数字转换器
      case 'format_number':
        try {
          const num = parseFloat(value);
          if (isNaN(num)) return value;
          const decimals = params?.decimals ?? 2;
          const separator = params?.separator || ',';
          return this.formatNumber(num, decimals, separator);
        } catch {
          return value;
        }
      
      // JSON 转换器
      case 'to_json':
        try {
          return JSON.stringify(value);
        } catch {
          return value;
        }
      
      case 'from_json':
        try {
          return JSON.parse(String(value));
        } catch {
          return value;
        }
      
      case 'default':
        return value;
      
      default:
        return value;
    }
  }

  /**
   * 获取嵌套值
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    
    return current;
  }

  /**
   * 评估简单条件
   */
  private evaluateCondition(item: any, condition: string): boolean {
    // 简单条件: status=active, age>18
    const match = condition.match(/^(\w+)(=|!=|>|<|>=|<=)(.+)$/);
    if (!match) return true;

    const [, field, op, valueStr] = match;
    const fieldValue = item[field];
    let compareValue: any = valueStr.replace(/^["']|["']$/g, '');
    
    // 尝试转换为数字
    if (!isNaN(Number(compareValue))) {
      compareValue = Number(compareValue);
    }

    switch (op) {
      case '=': return fieldValue == compareValue;
      case '!=': return fieldValue != compareValue;
      case '>': return fieldValue > compareValue;
      case '<': return fieldValue < compareValue;
      case '>=': return fieldValue >= compareValue;
      case '<=': return fieldValue <= compareValue;
      default: return true;
    }
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date, format: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * 格式化数字
   */
  private formatNumber(num: number, decimals: number, separator: string): string {
    const fixed = num.toFixed(decimals);
    const [intPart, decPart] = fixed.split('.');
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return decPart ? `${formattedInt}.${decPart}` : formattedInt;
  }

  /**
   * 解析接收人模板
   * 支持:
   * - 静态邮箱: user@example.com
   * - 系统用户: {{user:user_id}}
   * - 表格字段: {{field:field_id}}
   * - 变量: {{action_results.http_1.data.email}}
   * - 触发用户: {{trigger.user.email}}
   */
  async resolveRecipients(
    recipients: string[],
    context: VariableContext,
    userResolver?: (userId: string) => Promise<string | null>,
    fieldResolver?: (fieldId: string, recordData: Record<string, any>) => Promise<string | string[] | null>,
  ): Promise<string[]> {
    const resolvedEmails: string[] = [];

    for (const recipient of recipients) {
      // 系统用户
      const userMatch = recipient.match(/^\{\{user:(.+)\}\}$/);
      if (userMatch && userResolver) {
        const email = await userResolver(userMatch[1]);
        if (email) resolvedEmails.push(email);
        continue;
      }

      // 表格字段
      const fieldMatch = recipient.match(/^\{\{field:(.+)\}\}$/);
      if (fieldMatch && fieldResolver) {
        const result = await fieldResolver(fieldMatch[1], context.record);
        if (result) {
          if (Array.isArray(result)) {
            resolvedEmails.push(...result.filter(Boolean));
          } else {
            resolvedEmails.push(result);
          }
        }
        continue;
      }

      // 变量
      const varMatch = recipient.match(/^\{\{(.+)\}\}$/);
      if (varMatch) {
        const value = this.resolveVariable(varMatch[1], context);
        if (value) {
          if (Array.isArray(value)) {
            // 从数组中提取邮箱
            for (const item of value) {
              if (typeof item === 'string' && item.includes('@')) {
                resolvedEmails.push(item);
              } else if (typeof item === 'object' && item.email) {
                resolvedEmails.push(item.email);
              }
            }
          } else if (typeof value === 'string') {
            resolvedEmails.push(value);
          } else if (typeof value === 'object' && value.email) {
            resolvedEmails.push(value.email);
          }
        }
        continue;
      }

      // 静态邮箱
      if (recipient.includes('@')) {
        resolvedEmails.push(recipient);
      }
    }

    // 去重并验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return [...new Set(resolvedEmails)].filter((email) => emailRegex.test(email));
  }

  /**
   * 构建 HTTP 动作的输出变量
   */
  buildHttpActionOutput(response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: any;
  }): ActionResult {
    return {
      success: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
      output: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
      },
    };
  }

  /**
   * 构建变量上下文
   */
  buildVariableContext(params: {
    automation: any;
    triggerData: Record<string, any>;
    actionResults?: Record<string, ActionResult>;
    loopContext?: {
      index: number;
      item: any;
      items: any[];
    };
  }): VariableContext {
    const { automation, triggerData, actionResults = {}, loopContext } = params;
    const now = new Date();

    const context: VariableContext = {
      record: triggerData.record || {},
      previous_record: triggerData.previous_record,
      trigger: {
        type: automation.trigger?.type || 'manual',
        timestamp: now.toISOString(),
        user: triggerData.user,
        request: triggerData.request,
      },
      action_results: actionResults,
      system: {
        now: now.toISOString(),
        today: now.toISOString().split('T')[0],
        base_id: automation.base_id || '',
        table_id: automation.fk_model_id || '',
        automation_id: automation.id || '',
        execution_id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    };

    // 添加循环上下文
    if (loopContext) {
      context.loop = {
        index: loopContext.index,
        index1: loopContext.index + 1,
        item: loopContext.item,
        first: loopContext.index === 0,
        last: loopContext.index === loopContext.items.length - 1,
        length: loopContext.items.length,
      };
    }

    return context;
  }
}
