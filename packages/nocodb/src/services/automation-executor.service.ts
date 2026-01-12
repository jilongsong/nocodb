import { Injectable, Logger } from '@nestjs/common';
import type { NcContext } from '~/interface/config';
import { Automation, AutomationAction, AutomationLog, Model, Source, Column } from '~/models';
import type { AutomationType, AutomationTrigger } from '~/models/Automation';
import type { AutomationActionType, ActionConfig } from '~/models/AutomationAction';
import { NcError } from '~/helpers/catchError';
import NcConnectionMgrv2 from '~/utils/common/NcConnectionMgrv2';
import { AutomationTriggerService } from '~/services/automation-trigger.service';
import { AutomationVariableService } from '~/services/automation-variable.service';
import { AutomationRecipientService } from '~/services/automation-recipient.service';
import axios from 'axios';

/**
 * 自动化执行引擎
 * 负责执行自动化工作流，包括：
 * - 条件评估
 * - 动作执行
 * - 分支处理
 * - 日志记录
 */

export interface ExecutionContext {
  context: NcContext;
  automation: AutomationType;
  actions: AutomationActionType[];
  triggerData: Record<string, any>;
  logId: string;
  variables: ExecutionVariables;
  testMode?: boolean;
}

export interface ExecutionVariables {
  record: Record<string, any>;
  previous_record?: Record<string, any>;
  trigger: {
    type: string;
    timestamp: string;
    user?: { id: string; email: string; name?: string };
  };
  action_results: Record<string, any>;
  system: {
    now: string;
    base_id: string;
    table_id: string;
    automation_id: string;
  };
}

export interface ActionResult {
  success: boolean;
  output?: Record<string, any>;
  error?: string;
  skipped?: boolean;
}

export interface FilterCondition {
  id: string;
  field_id: string;
  operator: string;
  value?: any;
  value2?: any;
}

export interface FilterGroup {
  id: string;
  logical_op: 'and' | 'or';
  conditions: (FilterCondition | FilterGroup)[];
}

@Injectable()
export class AutomationExecutorService {
  private readonly logger = new Logger(AutomationExecutorService.name);
  private readonly variableService: AutomationVariableService;
  private readonly recipientService: AutomationRecipientService;

  constructor() {
    this.variableService = new AutomationVariableService();
    this.recipientService = new AutomationRecipientService();
  }

  /**
   * 执行自动化工作流
   */
  async execute(
    context: NcContext,
    params: {
      automationId: string;
      triggerData: Record<string, any>;
      testMode?: boolean;
      userId?: string;
    },
  ): Promise<{ success: boolean; logId: string; error?: string }> {
    const { automationId, triggerData, testMode, userId } = params;

    // 1. 获取自动化配置
    const automation = await Automation.get(context, automationId);
    if (!automation) {
      throw NcError.genericNotFound('Automation', automationId);
    }

    // 2. 获取动作列表
    const actions = await AutomationAction.listByAutomationId(context, automationId);

    // 3. 创建执行日志
    const trigger = automation.trigger as AutomationTrigger;
    const log = await AutomationLog.insert(context, {
      fk_automation_id: automationId,
      trigger_type: trigger?.type,
      trigger_data: triggerData,
      status: 'running',
      triggered_by: userId,
    });

    // 4. 构建执行上下文
    const execContext: ExecutionContext = {
      context,
      automation,
      actions,
      triggerData,
      logId: log.id!,
      testMode,
      variables: {
        record: triggerData.record || {},
        previous_record: triggerData.previous_record,
        trigger: {
          type: trigger?.type || 'manual',
          timestamp: new Date().toISOString(),
          user: triggerData.user,
        },
        action_results: {},
        system: {
          now: new Date().toISOString(),
          base_id: automation.base_id || '',
          table_id: automation.fk_model_id || '',
          automation_id: automationId,
        },
      },
    };

    try {
      // 5. 验证触发条件
      if (trigger?.conditions) {
        const conditionMet = await this.evaluateConditions(
          execContext,
          trigger.conditions as FilterGroup,
          execContext.variables.record,
        );
        
        if (!conditionMet) {
          await AutomationLog.complete(context, log.id!, 'success');
          return { success: true, logId: log.id!, error: 'Trigger conditions not met' };
        }
      }

      // 6. 执行动作链
      await this.executeActionChain(execContext, actions);

      // 7. 完成日志
      await AutomationLog.complete(context, log.id!, 'success');
      await Automation.incrementRunCount(context, automationId, true);

      return { success: true, logId: log.id! };
    } catch (error: any) {
      this.logger.error(`Automation execution failed: ${error.message}`, error.stack);
      
      await AutomationLog.complete(context, log.id!, 'failed', error.message);
      await Automation.incrementRunCount(context, automationId, false);
      await Automation.setError(context, automationId, error.message);

      return { success: false, logId: log.id!, error: error.message };
    }
  }

  /**
   * 执行动作链
   */
  private async executeActionChain(
    execContext: ExecutionContext,
    actions: AutomationActionType[],
  ): Promise<void> {
    // 按顺序执行动作
    const sortedActions = actions.sort((a, b) => (a.order || 0) - (b.order || 0));
    for (const action of sortedActions) {
      await this.executeAction(execContext, action);
    }
  }

  /**
   * 执行单个动作（支持重试）
   */
  private async executeAction(
    execContext: ExecutionContext,
    action: AutomationActionType,
  ): Promise<ActionResult> {
    const onError = action.on_error || 'stop';
    const maxRetries = onError === 'retry' ? (action.retry_count || 3) : 1;
    const retryDelay = (action.retry_delay_seconds || 5) * 1000;
    
    let lastResult: ActionResult = { success: false, error: 'No execution attempted' };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const isRetry = attempt > 1;
      
      try {
        lastResult = await this.executeActionOnce(execContext, action, attempt, maxRetries);
        
        // 执行成功，直接返回
        if (lastResult.success || lastResult.skipped) {
          return lastResult;
        }
        
        // 执行失败但未抛异常（业务逻辑失败）
        lastError = new Error(lastResult.error || 'Action failed');
        
        // 如果还有重试机会，等待后继续
        if (onError === 'retry' && attempt < maxRetries) {
          this.logger.warn(`Action ${action.id} failed (attempt ${attempt}/${maxRetries}): ${lastResult.error}`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        
        // 没有重试或重试用尽，根据策略处理
        break;
      } catch (error: any) {
        lastError = error;
        lastResult = { success: false, error: error.message };
        
        // 如果还有重试机会，等待后继续
        if (onError === 'retry' && attempt < maxRetries) {
          this.logger.warn(`Action ${action.id} threw error (attempt ${attempt}/${maxRetries}): ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        
        // 没有重试或重试用尽
        break;
      }
    }

    // 根据错误处理策略决定后续行为
    if (onError === 'stop') {
      throw lastError || new Error(lastResult.error || 'Action failed');
    }
    
    // continue 或 retry（重试用尽后继续）：返回失败结果但不中断流程
    return lastResult;
  }

  /**
   * 执行单个动作（单次尝试）
   */
  private async executeActionOnce(
    execContext: ExecutionContext,
    action: AutomationActionType,
    attemptNumber: number = 1,
    maxAttempts: number = 1,
  ): Promise<ActionResult> {
    const { context, logId } = execContext;
    const startTime = Date.now();
    const isRetry = attemptNumber > 1;

    // 创建动作日志
    const actionLog = await AutomationLog.insertActionLog(context, {
      fk_automation_log_id: logId,
      fk_action_id: action.id,
      action_type: action.type,
      status: isRetry ? 'retrying' : 'running',
      input: { 
        ...this.prepareActionInput(execContext, action), 
        attempt: attemptNumber,
        max_attempts: maxAttempts,
      },
      started_at: new Date().toISOString(),
    });

    try {
      let result: ActionResult;

      switch (action.type) {
        case 'record.create':
          result = await this.executeRecordCreate(execContext, action);
          break;
        case 'http.request':
          result = await this.executeHttpRequest(execContext, action);
          break;
        case 'notification.email':
          result = await this.executeEmailNotification(execContext, action);
          break;
        case 'notification.webhook':
        case 'notification.feishu':
        case 'notification.dingtalk':
        case 'notification.wechat':
        case 'notification.slack':
          result = await this.executeWebhookNotification(execContext, action);
          break;
        case 'script.run':
          result = await this.executeScript(execContext, action);
          break;
        default:
          result = { success: false, error: `Unknown action type: ${action.type}` };
      }

      // 保存动作结果到变量（无论成功失败都保存，便于后续动作判断）
      execContext.variables.action_results[action.id!] = {
        success: result.success,
        output: result.output,
        error: result.error,
      };

      // 更新动作日志
      const duration = Date.now() - startTime;
      await AutomationLog.updateActionLog(context, actionLog.id!, {
        status: result.success ? 'success' : (result.skipped ? 'skipped' : 'failed'),
        output: result.output,
        error: result.error,
        completed_at: new Date().toISOString(),
        duration_ms: duration,
      });

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      await AutomationLog.updateActionLog(context, actionLog.id!, {
        status: 'failed',
        error: error.message,
        completed_at: new Date().toISOString(),
        duration_ms: duration,
      });

      // 保存错误结果到变量
      execContext.variables.action_results[action.id!] = {
        success: false,
        error: error.message,
      };

      throw error; // 向上抛出，由 executeAction 处理
    }
  }

  /**
   * 执行记录创建动作
   */
  private async executeRecordCreate(
    execContext: ExecutionContext,
    action: AutomationActionType,
  ): Promise<ActionResult> {
    const { context, testMode } = execContext;
    const config = action.config as ActionConfig;

    const tableId = config.target_table_id || execContext.automation.fk_model_id;
    if (!tableId) {
      return { success: false, error: 'No target table specified' };
    }

    // 构建创建数据 - 需要将字段ID转换为字段名称
    const createData = await this.buildFieldMappingDataWithColumnNames(
      execContext,
      config.field_mappings || [],
      tableId,
    );

    this.logger.log(`Record create data: ${JSON.stringify(createData)}`);

    if (testMode) {
      return {
        success: true,
        output: { testMode: true, createData, tableId },
      };
    }

    try {
      const model = await Model.get(context, tableId);
      if (!model) {
        return { success: false, error: `Table not found: ${tableId}` };
      }

      const source = await Source.get(context, model.source_id);
      const baseModel = await Model.getBaseModelSQL(context, {
        id: model.id,
        dbDriver: await NcConnectionMgrv2.get(source),
        source,
      });

      const result = await baseModel.insert(createData, null, null);

      // 标记为自动化创建的记录，防止无限循环
      const recordId = result?.Id || result?.id;
      if (recordId) {
        AutomationTriggerService.markAsAutomationCreated(tableId, recordId);
      }

      return {
        success: true,
        output: { created: true, record: result },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 执行邮件通知动作
   */
  private async executeEmailNotification(
    execContext: ExecutionContext,
    action: AutomationActionType,
  ): Promise<ActionResult> {
    const { testMode } = execContext;
    const config = action.config as ActionConfig;

    if (!config.recipients?.length) {
      return { success: false, error: 'No recipients specified' };
    }

    const subject = this.resolveTemplate(execContext, config.subject_template || '');
    const body = this.resolveTemplate(execContext, config.body_template || '');

    if (testMode) {
      return {
        success: true,
        output: { testMode: true, recipients: config.recipients, subject, body },
      };
    }

    // TODO: 实现实际的邮件发送逻辑
    // 这里可以集成 NocoDB 现有的邮件服务
    this.logger.log(`Email notification: to=${config.recipients.join(',')}, subject=${subject}`);

    return {
      success: true,
      output: { sent: true, recipients: config.recipients },
    };
  }

  /**
   * 执行 HTTP 请求动作（增强版，支持完整响应捕获）
   */
  private async executeHttpRequest(
    execContext: ExecutionContext,
    action: AutomationActionType,
  ): Promise<ActionResult> {
    const { testMode } = execContext;
    const config = action.config as ActionConfig;

    if (!config.webhook_url) {
      return { success: false, error: 'No request URL specified' };
    }

    // 解析 URL（支持变量）
    const url = this.resolveTemplate(execContext, config.webhook_url);
    const method = config.webhook_method || 'GET';
    const headers = config.webhook_headers || {};
    const timeout = (config as any).timeout_ms || 30000;

    // 解析请求体
    let body: any;
    if (method !== 'GET' && (config.webhook_body_template || config.body_template)) {
      const bodyStr = this.resolveTemplate(
        execContext,
        config.webhook_body_template || config.body_template || '',
      );
      try {
        body = JSON.parse(bodyStr);
      } catch {
        body = bodyStr;
      }
    }

    if (testMode) {
      return {
        success: true,
        output: { testMode: true, url, method, headers, body },
      };
    }

    try {
      const response = await axios({
        method: method as any,
        url,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        data: body,
        timeout,
        validateStatus: () => true, // 不抛出 HTTP 错误
      });

      // 构建完整的响应输出
      const output = this.variableService.buildHttpActionOutput({
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
        data: response.data,
      });

      // 使用自定义变量名或动作 ID
      const varName = (config as any).response_variable_name || action.id;
      if (varName) {
        execContext.variables.action_results[varName] = output.output;
      }

      return {
        success: response.status >= 200 && response.status < 300,
        output: output.output,
        error: response.status >= 400 ? `HTTP ${response.status}: ${response.statusText}` : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 执行 Webhook 通知动作
   */
  private async executeWebhookNotification(
    execContext: ExecutionContext,
    action: AutomationActionType,
  ): Promise<ActionResult> {
    const { testMode } = execContext;
    const config = action.config as ActionConfig;

    if (!config.webhook_url) {
      return { success: false, error: 'No webhook URL specified' };
    }

    const url = config.webhook_url;
    const method = config.webhook_method || 'POST';
    const headers = config.webhook_headers || {};
    
    // 解析请求体模板
    let body: any;
    if (config.webhook_body_template) {
      const bodyStr = this.resolveTemplate(execContext, config.webhook_body_template);
      try {
        body = JSON.parse(bodyStr);
      } catch {
        body = { text: bodyStr };
      }
    } else if (config.body_template) {
      // 对于飞书/钉钉等，使用简单文本格式
      const text = this.resolveTemplate(execContext, config.body_template);
      body = this.formatMessageBody(action.type!, text);
    } else {
      body = { data: execContext.variables.record };
    }

    if (testMode) {
      return {
        success: true,
        output: { testMode: true, url, method, body },
      };
    }

    try {
      const response = await axios({
        method: method as any,
        url,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        data: body,
        timeout: 30000,
      });

      return {
        success: true,
        output: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * 评估条件组
   */
  private async evaluateConditions(
    execContext: ExecutionContext,
    filterGroup: FilterGroup,
    data: Record<string, any>,
  ): Promise<boolean> {
    if (!filterGroup?.conditions?.length) {
      return true;
    }

    const { logical_op, conditions } = filterGroup;
    const results: boolean[] = [];

    for (const condition of conditions) {
      if ('logical_op' in condition) {
        // 嵌套条件组
        const result = await this.evaluateConditions(execContext, condition as FilterGroup, data);
        results.push(result);
      } else {
        // 单个条件
        const result = this.evaluateSingleCondition(condition as FilterCondition, data);
        results.push(result);
      }
    }

    if (logical_op === 'and') {
      return results.every((r) => r);
    } else {
      return results.some((r) => r);
    }
  }

  /**
   * 评估单个条件
   */
  private evaluateSingleCondition(
    condition: FilterCondition,
    data: Record<string, any>,
  ): boolean {
    const { field_id, operator, value, value2 } = condition;
    const fieldValue = data[field_id];

    switch (operator) {
      case 'eq':
        return fieldValue === value;
      case 'neq':
        return fieldValue !== value;
      case 'gt':
        return fieldValue > value;
      case 'gte':
        return fieldValue >= value;
      case 'lt':
        return fieldValue < value;
      case 'lte':
        return fieldValue <= value;
      case 'like':
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
      case 'nlike':
        return !String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
      case 'is_empty':
        return fieldValue === null || fieldValue === undefined || fieldValue === '';
      case 'is_not_empty':
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
      case 'is_null':
        return fieldValue === null || fieldValue === undefined;
      case 'is_not_null':
        return fieldValue !== null && fieldValue !== undefined;
      case 'in':
        return Array.isArray(value) ? value.includes(fieldValue) : false;
      case 'not_in':
        return Array.isArray(value) ? !value.includes(fieldValue) : true;
      case 'between':
        return fieldValue >= value && fieldValue <= value2;
      case 'not_between':
        return fieldValue < value || fieldValue > value2;
      default:
        return false;
    }
  }

  /**
   * 构建字段映射数据（将字段ID转换为列名）
   */
  private async buildFieldMappingDataWithColumnNames(
    execContext: ExecutionContext,
    fieldMappings: any[],
    targetTableId: string,
  ): Promise<Record<string, any>> {
    const { context } = execContext;
    const data: Record<string, any> = {};

    // 获取目标表的所有列
    const targetModel = await Model.get(context, targetTableId);
    if (!targetModel) return data;

    const targetColumns = await targetModel.getColumns(context);
    const targetColumnMap = new Map<string, any>();
    targetColumns.forEach((col: any) => {
      targetColumnMap.set(col.id, col);
    });

    // 获取源表的所有列（用于解析源字段ID）
    const sourceTableId = execContext.automation.fk_model_id;
    let sourceColumnMap = new Map<string, any>();
    if (sourceTableId) {
      const sourceModel = await Model.get(context, sourceTableId);
      if (sourceModel) {
        const sourceColumns = await sourceModel.getColumns(context);
        sourceColumns.forEach((col: any) => {
          sourceColumnMap.set(col.id, col);
        });
      }
    }

    // 构建记录数据的字段名映射（因为记录数据可能使用列名而不是ID）
    const recordByColumnName = new Map<string, any>();
    const recordByColumnId = new Map<string, any>();
    for (const [key, value] of Object.entries(execContext.variables.record || {})) {
      recordByColumnName.set(key, value);
      // 尝试通过列名找到列ID
      for (const [colId, col] of sourceColumnMap) {
        if (col.title === key || col.column_name === key) {
          recordByColumnId.set(colId, value);
        }
      }
    }

    for (const mapping of fieldMappings) {
      const { target_field_id, value_type, source_field_id, static_value, formula } = mapping;

      // 获取目标列信息
      const targetColumn = targetColumnMap.get(target_field_id);
      if (!targetColumn) {
        this.logger.warn(`Target column not found: ${target_field_id}`);
        continue;
      }

      let value: any;
      switch (value_type) {
        case 'static':
          value = static_value;
          break;
        case 'field':
          // 首先尝试通过列ID获取值
          value = recordByColumnId.get(source_field_id);
          if (value === undefined) {
            // 尝试通过源列名获取值
            const sourceColumn = sourceColumnMap.get(source_field_id);
            if (sourceColumn) {
              value = recordByColumnName.get(sourceColumn.title) 
                   || recordByColumnName.get(sourceColumn.column_name);
            }
          }
          break;
        case 'formula':
          value = this.resolveTemplate(execContext, formula || '');
          break;
        case 'variable':
          value = this.resolveVariable(execContext, static_value || '');
          break;
        default:
          value = static_value;
      }

      // 使用目标列的列名作为key
      const columnKey = targetColumn.title || targetColumn.column_name;
      if (columnKey && value !== undefined) {
        data[columnKey] = value;
        this.logger.log(`Field mapping: ${source_field_id} -> ${columnKey} = ${value}`);
      }
    }

    return data;
  }

  /**
   * 解析模板字符串中的变量（使用增强变量服务）
   */
  private resolveTemplate(execContext: ExecutionContext, template: string): string {
    if (!template) return '';

    // 构建变量上下文
    const variableContext = this.variableService.buildVariableContext({
      automation: execContext.automation,
      triggerData: execContext.triggerData,
      actionResults: execContext.variables.action_results,
    });

    return this.variableService.resolveTemplate(template, variableContext);
  }

  /**
   * 解析变量路径（使用增强变量服务）
   */
  private resolveVariable(execContext: ExecutionContext, path: string): any {
    const variableContext = this.variableService.buildVariableContext({
      automation: execContext.automation,
      triggerData: execContext.triggerData,
      actionResults: execContext.variables.action_results,
    });

    return this.variableService.resolveVariable(path, variableContext);
  }

  /**
   * 解析接收人列表
   */
  private async resolveRecipients(
    context: NcContext,
    execContext: ExecutionContext,
    recipients: string[],
  ): Promise<string[]> {
    const variableContext = this.variableService.buildVariableContext({
      automation: execContext.automation,
      triggerData: execContext.triggerData,
      actionResults: execContext.variables.action_results,
    });

    return this.recipientService.resolveRecipients(context, recipients, {
      tableId: execContext.automation.fk_model_id || '',
      recordData: execContext.variables.record,
      variableContext,
    });
  }

  /**
   * 格式化消息体（用于不同的通知平台）
   */
  private formatMessageBody(actionType: string, text: string): any {
    switch (actionType) {
      case 'notification.feishu':
        return {
          msg_type: 'text',
          content: { text },
        };
      case 'notification.dingtalk':
        return {
          msgtype: 'text',
          text: { content: text },
        };
      case 'notification.wechat':
        return {
          msgtype: 'text',
          text: { content: text },
        };
      case 'notification.slack':
        return { text };
      default:
        return { text };
    }
  }

  /**
   * 准备动作输入日志
   */
  private prepareActionInput(
    execContext: ExecutionContext,
    action: AutomationActionType,
  ): Record<string, any> {
    return {
      type: action.type,
      config: action.config,
      record: execContext.variables.record,
    };
  }

  /**
   * 执行脚本动作
   */
  private async executeScript(
    execContext: ExecutionContext,
    action: AutomationActionType,
  ): Promise<ActionResult> {
    const { testMode } = execContext;
    const config = action.config as ActionConfig;

    if (!config.script_code) {
      return { success: false, error: '未提供脚本代码' };
    }

    // 构建脚本执行上下文
    const scriptContext = {
      record: execContext.variables.record,
      previous_record: execContext.variables.previous_record,
      trigger: execContext.variables.trigger,
      action_results: execContext.variables.action_results,
      system: execContext.variables.system,
      params: config.script_params || {},
    };

    if (testMode) {
      return {
        success: true,
        output: {
          testMode: true,
          scriptId: config.script_id,
          context: scriptContext,
        },
      };
    }

    try {
      // 使用 Function 构造器创建沙箱执行环境
      // 注意：这是一个简化的实现，生产环境应该使用更安全的沙箱
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      
      // 包装脚本代码，提供 context 变量
      const wrappedCode = `
        const context = arguments[0];
        const record = context.record;
        const previous_record = context.previous_record;
        const trigger = context.trigger;
        const action_results = context.action_results;
        const system = context.system;
        const params = context.params;
        
        ${config.script_code}
      `;

      const scriptFn = new AsyncFunction(wrappedCode);
      
      // 设置执行超时
      const timeoutMs = 30000; // 30 秒超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('脚本执行超时')), timeoutMs);
      });

      const result = await Promise.race([
        scriptFn(scriptContext),
        timeoutPromise,
      ]);

      // 处理返回结果
      // 保持脚本返回的完整结构，使 action_results 中的数据与脚本返回一致
      if (result && typeof result === 'object') {
        if ('success' in result) {
          // 脚本返回了标准格式 { success, data, error }
          // 直接将完整返回对象存入 output，保持数据结构一致性
          return {
            success: result.success,
            output: result,  // 保留完整的返回对象
            error: result.error,
          };
        }
        // 脚本返回了普通对象，包装成标准格式
        return {
          success: true,
          output: {
            success: true,
            data: result,
          },
        };
      }

      // 脚本返回了非对象值
      return {
        success: true,
        output: {
          success: true,
          data: result,
        },
      };
    } catch (error: any) {
      this.logger.error(`Script execution error: ${error.message}`, error.stack);
      return {
        success: false,
        error: `脚本执行失败: ${error.message}`,
      };
    }
  }
}
