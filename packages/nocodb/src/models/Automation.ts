import type { BoolType } from 'nocodb-sdk';
import type { NcContext } from '~/interface/config';
import {
  CacheDelDirection,
  CacheGetType,
  CacheScope,
  MetaTable,
} from '~/utils/globals';
import Noco from '~/Noco';
import NocoCache from '~/cache/NocoCache';
import { extractProps } from '~/helpers/extractProps';
import { NcError } from '~/helpers/catchError';

export interface AutomationTriggerConfig {
  watch_fields?: string[];
  cron_expression?: string;
  interval_minutes?: number;
  timezone?: string;
  form_view_id?: string;
  webhook_secret?: string;
}

export interface AutomationTrigger {
  id: string;
  type: string;
  config: AutomationTriggerConfig;
  conditions?: Record<string, any>;
}

export interface AutomationType {
  id?: string;
  fk_workspace_id?: string;
  base_id?: string;
  fk_model_id?: string;
  title?: string;
  description?: string;
  trigger?: AutomationTrigger | string;
  is_active?: BoolType;
  status?: 'active' | 'inactive' | 'error';
  run_count?: number;
  success_count?: number;
  error_count?: number;
  last_run_at?: string;
  last_error?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export default class Automation implements AutomationType {
  id?: string;
  fk_workspace_id?: string;
  base_id?: string;
  fk_model_id?: string;
  title?: string;
  description?: string;
  trigger?: AutomationTrigger | string;
  is_active?: BoolType;
  status?: 'active' | 'inactive' | 'error';
  run_count?: number;
  success_count?: number;
  error_count?: number;
  last_run_at?: string;
  last_error?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;

  constructor(automation: Partial<Automation>) {
    Object.assign(this, automation);
    // Parse trigger if it's a string
    if (typeof this.trigger === 'string') {
      try {
        this.trigger = JSON.parse(this.trigger);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }
  }

  public static async get(
    context: NcContext,
    automationId: string,
    ncMeta = Noco.ncMeta,
  ): Promise<Automation | null> {
    let automation =
      automationId &&
      (await NocoCache.get(
        `${CacheScope.AUTOMATION}:${automationId}`,
        CacheGetType.TYPE_OBJECT,
      ));

    if (!automation) {
      automation = await ncMeta.metaGet2(
        context.workspace_id,
        context.base_id,
        MetaTable.AUTOMATIONS,
        automationId,
      );

      if (automation) {
        await NocoCache.set(`${CacheScope.AUTOMATION}:${automationId}`, automation);
      }
    }

    return automation ? new Automation(automation) : null;
  }

  public static async list(
    context: NcContext,
    param: {
      fk_model_id?: string;
      base_id?: string;
    },
    ncMeta = Noco.ncMeta,
  ): Promise<Automation[]> {
    const condition: Record<string, any> = {};

    if (param.fk_model_id) {
      condition.fk_model_id = param.fk_model_id;
    }

    if (param.base_id) {
      condition.base_id = param.base_id;
    }

    const automations = await ncMeta.metaList2(
      context.workspace_id,
      context.base_id,
      MetaTable.AUTOMATIONS,
      {
        condition,
        orderBy: {
          created_at: 'desc',
        },
      },
    );

    return automations.map((a: any) => new Automation(a));
  }

  public static async listByBaseId(
    context: NcContext,
    baseId: string,
    ncMeta = Noco.ncMeta,
  ): Promise<Automation[]> {
    return this.list(context, { base_id: baseId }, ncMeta);
  }

  public static async insert(
    context: NcContext,
    automation: Partial<AutomationType>,
    ncMeta = Noco.ncMeta,
  ): Promise<Automation> {
    const insertObj = extractProps(automation, [
      'fk_model_id',
      'title',
      'description',
      'trigger',
      'is_active',
      'status',
      'created_by',
    ]);

    // Serialize trigger to JSON string
    if (typeof insertObj.trigger === 'object') {
      insertObj.trigger = JSON.stringify(insertObj.trigger);
    }

    insertObj.base_id = context.base_id;
    insertObj.fk_workspace_id = context.workspace_id;
    insertObj.run_count = 0;
    insertObj.success_count = 0;
    insertObj.error_count = 0;

    const { id } = await ncMeta.metaInsert2(
      context.workspace_id,
      context.base_id,
      MetaTable.AUTOMATIONS,
      insertObj,
    );

    return this.get(context, id, ncMeta) as Promise<Automation>;
  }

  public static async update(
    context: NcContext,
    automationId: string,
    automation: Partial<AutomationType>,
    ncMeta = Noco.ncMeta,
  ): Promise<Automation> {
    const updateObj = extractProps(automation, [
      'title',
      'description',
      'trigger',
      'is_active',
      'status',
      'run_count',
      'success_count',
      'error_count',
      'last_run_at',
      'last_error',
    ]);

    // Serialize trigger to JSON string
    if (typeof updateObj.trigger === 'object') {
      updateObj.trigger = JSON.stringify(updateObj.trigger);
    }

    await ncMeta.metaUpdate(
      context.workspace_id,
      context.base_id,
      MetaTable.AUTOMATIONS,
      updateObj,
      automationId,
    );

    // Clear cache
    await NocoCache.del(`${CacheScope.AUTOMATION}:${automationId}`);

    return this.get(context, automationId, ncMeta) as Promise<Automation>;
  }

  public static async delete(
    context: NcContext,
    automationId: string,
    ncMeta = Noco.ncMeta,
  ): Promise<boolean> {
    const automation = await this.get(context, automationId, ncMeta);
    if (!automation) {
      NcError.genericNotFound('Automation', automationId);
    }

    // Delete associated actions
    await ncMeta.metaDelete(
      context.workspace_id,
      context.base_id,
      MetaTable.AUTOMATION_ACTIONS,
      { fk_automation_id: automationId },
    );

    // Delete associated logs
    await ncMeta.metaDelete(
      context.workspace_id,
      context.base_id,
      MetaTable.AUTOMATION_LOGS,
      { fk_automation_id: automationId },
    );

    // Delete the automation
    await ncMeta.metaDelete(
      context.workspace_id,
      context.base_id,
      MetaTable.AUTOMATIONS,
      automationId,
    );

    // Clear cache
    await NocoCache.del(`${CacheScope.AUTOMATION}:${automationId}`);

    return true;
  }

  public static async incrementRunCount(
    context: NcContext,
    automationId: string,
    success: boolean,
    ncMeta = Noco.ncMeta,
  ): Promise<void> {
    const automation = await this.get(context, automationId, ncMeta);
    if (!automation) return;

    const updateObj: Partial<AutomationType> = {
      run_count: (automation.run_count || 0) + 1,
      last_run_at: new Date().toISOString(),
    };

    if (success) {
      updateObj.success_count = (automation.success_count || 0) + 1;
      updateObj.status = 'active';
      updateObj.last_error = undefined;
    } else {
      updateObj.error_count = (automation.error_count || 0) + 1;
    }

    await this.update(context, automationId, updateObj, ncMeta);
  }

  public static async setError(
    context: NcContext,
    automationId: string,
    error: string,
    ncMeta = Noco.ncMeta,
  ): Promise<void> {
    await this.update(
      context,
      automationId,
      {
        status: 'error',
        last_error: error,
      },
      ncMeta,
    );
  }
}
