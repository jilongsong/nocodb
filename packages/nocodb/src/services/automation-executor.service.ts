import { Injectable, Logger } from '@nestjs/common';
import type { NcContext } from '~/interface/config';
import { Automation, AutomationAction, AutomationLog, Model, Source, Column } from '~/models';
import type { AutomationType, AutomationTrigger } from '~/models/Automation';
import type { AutomationActionType, ActionConfig } from '~/models/AutomationAction';
import { NcError } from '~/helpers/catchError';
import NcConnectionMgrv2 from '~/utils/common/NcConnectionMgrv2';
import { AutomationTriggerService } from '~/services/automation-trigger.service';
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

  constructor() {}

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
   * 执行单个动作
   */
  private async executeAction(
    execContext: ExecutionContext,
    action: AutomationActionType,
  ): Promise<ActionResult> {
    const { context, logId } = execContext;
    const startTime = Date.now();

    // 创建动作日志
    const actionLog = await AutomationLog.insertActionLog(context, {
      fk_automation_log_id: logId,
      fk_action_id: action.id,
      action_type: action.type,
      status: 'running',
      input: this.prepareActionInput(execContext, action),
      started_at: new Date().toISOString(),
    });

    try {
      let result: ActionResult;

      switch (action.type) {
        case 'record.create':
          result = await this.executeRecordCreate(execContext, action);
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
        default:
          result = { success: false, error: `Unknown action type: ${action.type}` };
      }

      // 保存动作结果到变量
      if (result.success && result.output) {
        execContext.variables.action_results[action.id!] = result.output;
      }

      // 更新动作日志
      const duration = Date.now() - startTime;
      await AutomationLog.updateActionLog(context, actionLog.id!, {
        status: result.success ? 'success' : (result.skipped ? 'skipped' : 'failed'),
        output: result.output,
        error: result.error,
        completed_at: new Date().toISOString(),
        duration_ms: duration,
      });

      // 错误处理
      if (!result.success && !result.skipped) {
        if (action.on_error === 'stop') {
          throw new Error(result.error || 'Action failed');
        }
        // on_error === 'continue' 时继续执行
      }

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      await AutomationLog.updateActionLog(context, actionLog.id!, {
        status: 'failed',
        error: error.message,
        completed_at: new Date().toISOString(),
        duration_ms: duration,
      });

      if (action.on_error === 'stop') {
        throw error;
      }

      return { success: false, error: error.message };
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
   * 解析模板字符串中的变量
   */
  private resolveTemplate(execContext: ExecutionContext, template: string): string {
    if (!template) return '';

    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.resolveVariable(execContext, path.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * 解析变量路径
   */
  private resolveVariable(execContext: ExecutionContext, path: string): any {
    const { variables } = execContext;
    const parts = path.split('.');

    let current: any = variables;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }

    return current;
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
}
