import type { NcContext } from '~/interface/config';
import {
  CacheGetType,
  CacheScope,
  MetaTable,
} from '~/utils/globals';
import Noco from '~/Noco';
import NocoCache from '~/cache/NocoCache';
import { extractProps } from '~/helpers/extractProps';

export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'skipped';

export interface ActionLogType {
  id?: string;
  fk_automation_log_id?: string;
  fk_action_id?: string;
  action_type?: string;
  status?: ExecutionStatus;
  input?: Record<string, any> | string;
  output?: Record<string, any> | string;
  error?: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
}

export interface AutomationLogType {
  id?: string;
  fk_workspace_id?: string;
  base_id?: string;
  fk_automation_id?: string;
  trigger_type?: string;
  trigger_data?: Record<string, any> | string;
  status?: ExecutionStatus;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  error?: string;
  triggered_by?: string;
  created_at?: string;
}

export default class AutomationLog implements AutomationLogType {
  id?: string;
  fk_workspace_id?: string;
  base_id?: string;
  fk_automation_id?: string;
  trigger_type?: string;
  trigger_data?: Record<string, any> | string;
  status?: ExecutionStatus;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  error?: string;
  triggered_by?: string;
  created_at?: string;

  // Populated field
  action_logs?: ActionLogType[];

  constructor(log: Partial<AutomationLog>) {
    Object.assign(this, log);
    // Parse trigger_data if it's a string
    if (typeof this.trigger_data === 'string') {
      try {
        this.trigger_data = JSON.parse(this.trigger_data);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }
  }

  public static async get(
    context: NcContext,
    logId: string,
    ncMeta = Noco.ncMeta,
  ): Promise<AutomationLog | null> {
    const log = await ncMeta.metaGet2(
      context.workspace_id,
      context.base_id,
      MetaTable.AUTOMATION_LOGS,
      logId,
    );

    if (log) {
      // Load action logs - 使用 knex 直接查询，因为 action_logs 表没有 base_id 列
      const knex = ncMeta.knex || Noco.ncMeta.knex;
      const actionLogs = await knex(MetaTable.AUTOMATION_ACTION_LOGS)
        .where('fk_automation_log_id', logId)
        .orderBy('started_at', 'asc');

      log.action_logs = actionLogs.map((al: any) => {
        if (typeof al.input === 'string') {
          try { al.input = JSON.parse(al.input); } catch (e) {}
        }
        if (typeof al.output === 'string') {
          try { al.output = JSON.parse(al.output); } catch (e) {}
        }
        return al;
      });
    }

    return log ? new AutomationLog(log) : null;
  }

  public static async list(
    context: NcContext,
    param: {
      fk_automation_id: string;
      limit?: number;
      offset?: number;
    },
    ncMeta = Noco.ncMeta,
  ): Promise<{ list: AutomationLog[]; count: number }> {
    const { fk_automation_id, limit = 50, offset = 0 } = param;

    const logs = await ncMeta.metaList2(
      context.workspace_id,
      context.base_id,
      MetaTable.AUTOMATION_LOGS,
      {
        condition: { fk_automation_id },
        orderBy: { created_at: 'desc' },
        limit,
        offset,
      },
    );

    const count = await ncMeta.metaCount(
      context.workspace_id,
      context.base_id,
      MetaTable.AUTOMATION_LOGS,
      { condition: { fk_automation_id } },
    );

    return {
      list: logs.map((l: any) => new AutomationLog(l)),
      count,
    };
  }

  public static async insert(
    context: NcContext,
    log: Partial<AutomationLogType>,
    ncMeta = Noco.ncMeta,
  ): Promise<AutomationLog> {
    const insertObj = extractProps(log, [
      'fk_automation_id',
      'trigger_type',
      'trigger_data',
      'status',
      'started_at',
      'triggered_by',
    ]);

    // Serialize trigger_data to JSON string
    if (typeof insertObj.trigger_data === 'object') {
      insertObj.trigger_data = JSON.stringify(insertObj.trigger_data);
    }

    insertObj.base_id = context.base_id;
    insertObj.fk_workspace_id = context.workspace_id;
    insertObj.status = insertObj.status || 'pending';
    insertObj.started_at = insertObj.started_at || new Date().toISOString();

    const { id } = await ncMeta.metaInsert2(
      context.workspace_id,
      context.base_id,
      MetaTable.AUTOMATION_LOGS,
      insertObj,
    );

    return this.get(context, id, ncMeta) as Promise<AutomationLog>;
  }

  public static async update(
    context: NcContext,
    logId: string,
    log: Partial<AutomationLogType>,
    ncMeta = Noco.ncMeta,
  ): Promise<AutomationLog> {
    const updateObj = extractProps(log, [
      'status',
      'completed_at',
      'duration_ms',
      'error',
    ]);

    await ncMeta.metaUpdate(
      context.workspace_id,
      context.base_id,
      MetaTable.AUTOMATION_LOGS,
      updateObj,
      logId,
    );

    return this.get(context, logId, ncMeta) as Promise<AutomationLog>;
  }

  public static async complete(
    context: NcContext,
    logId: string,
    status: 'success' | 'failed',
    error?: string,
    ncMeta = Noco.ncMeta,
  ): Promise<AutomationLog> {
    const log = await this.get(context, logId, ncMeta);
    if (!log) throw new Error('Log not found');

    const startedAt = new Date(log.started_at || Date.now());
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    return this.update(
      context,
      logId,
      {
        status,
        completed_at: completedAt.toISOString(),
        duration_ms: durationMs,
        error,
      },
      ncMeta,
    );
  }

  public static async insertActionLog(
    context: NcContext,
    actionLog: Partial<ActionLogType>,
    ncMeta = Noco.ncMeta,
  ): Promise<ActionLogType> {
    const insertObj = extractProps(actionLog, [
      'fk_automation_log_id',
      'fk_action_id',
      'action_type',
      'status',
      'input',
      'output',
      'error',
      'started_at',
      'completed_at',
      'duration_ms',
    ]);

    // Serialize input/output to JSON string
    if (typeof insertObj.input === 'object') {
      insertObj.input = JSON.stringify(insertObj.input);
    }
    if (typeof insertObj.output === 'object') {
      insertObj.output = JSON.stringify(insertObj.output);
    }

    // 使用 knex 直接插入，因为 action_logs 表没有 base_id 列
    const knex = ncMeta.knex || Noco.ncMeta.knex;
    const id = await ncMeta.genNanoid(MetaTable.AUTOMATION_ACTION_LOGS);
    insertObj.id = id;

    await knex(MetaTable.AUTOMATION_ACTION_LOGS).insert(insertObj);

    return { ...insertObj, id };
  }

  public static async updateActionLog(
    context: NcContext,
    actionLogId: string,
    actionLog: Partial<ActionLogType>,
    ncMeta = Noco.ncMeta,
  ): Promise<void> {
    const updateObj = extractProps(actionLog, [
      'status',
      'output',
      'error',
      'completed_at',
      'duration_ms',
    ]);

    // Serialize output to JSON string
    if (typeof updateObj.output === 'object') {
      updateObj.output = JSON.stringify(updateObj.output);
    }

    // 使用 knex 直接更新，因为 action_logs 表没有 base_id 列
    const knex = ncMeta.knex || Noco.ncMeta.knex;
    await knex(MetaTable.AUTOMATION_ACTION_LOGS)
      .where('id', actionLogId)
      .update(updateObj);
  }

  public static async deleteByAutomationId(
    context: NcContext,
    automationId: string,
    ncMeta = Noco.ncMeta,
  ): Promise<void> {
    // First get all log IDs
    const logs = await ncMeta.metaList2(
      context.workspace_id,
      context.base_id,
      MetaTable.AUTOMATION_LOGS,
      {
        condition: { fk_automation_id: automationId },
        fields: ['id'],
      },
    );

    // 使用 knex 直接删除 action logs，因为 action_logs 表没有 base_id 列
    const knex = ncMeta.knex || Noco.ncMeta.knex;
    for (const log of logs) {
      await knex(MetaTable.AUTOMATION_ACTION_LOGS)
        .where('fk_automation_log_id', log.id)
        .delete();
    }

    // Delete automation logs
    await ncMeta.metaDelete(
      context.workspace_id,
      context.base_id,
      MetaTable.AUTOMATION_LOGS,
      { fk_automation_id: automationId },
    );
  }
}
