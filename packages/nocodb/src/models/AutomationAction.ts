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

export interface ActionConfig {
  target_table_id?: string;
  field_mappings?: Array<{
    source_field_id?: string;
    target_field_id: string;
    value_type: 'field' | 'static' | 'formula' | 'variable';
    static_value?: any;
    formula?: string;
  }>;
  record_filter?: Record<string, any>;

  // 保存记录配置
  save_mode?: 'create' | 'upsert';           // 保存模式：创建新记录 / 更新或创建
  upsert_key_field_id?: string;              // Upsert 时的唯一键字段
  data_source?: 'trigger' | 'action_result'; // 数据来源
  source_action_id?: string;                 // 来源动作ID（当 data_source 为 action_result 时）
  auto_map_fields?: boolean;                 // 是否自动映射同名字段
  include_metadata?: boolean;                // 是否包含元数据

  recipients?: string[];
  subject_template?: string;
  body_template?: string;
  webhook_url?: string;
  webhook_method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  webhook_headers?: Record<string, string>;
  webhook_body_template?: string;
  script_id?: string;
  script_params?: Record<string, any>;
}

export interface AutomationActionType {
  id?: string;
  fk_workspace_id?: string;
  base_id?: string;
  fk_automation_id?: string;
  type?: string;
  title?: string;
  order?: number;
  config?: ActionConfig | string;
  on_error?: 'stop' | 'continue' | 'retry';
  retry_count?: number;
  next_action_id?: string;
  created_at?: string;
  updated_at?: string;
}

export default class AutomationAction implements AutomationActionType {
  id?: string;
  fk_workspace_id?: string;
  base_id?: string;
  fk_automation_id?: string;
  type?: string;
  title?: string;
  order?: number;
  config?: ActionConfig | string;
  on_error?: 'stop' | 'continue' | 'retry';
  retry_count?: number;
  next_action_id?: string;
  created_at?: string;
  updated_at?: string;

  constructor(action: Partial<AutomationAction>) {
    Object.assign(this, action);
    // Parse config if it's a string
    if (typeof this.config === 'string') {
      try {
        this.config = JSON.parse(this.config);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }
  }

  public static async get(
    context: NcContext,
    actionId: string,
    ncMeta = Noco.ncMeta,
  ): Promise<AutomationAction | null> {
    const action = await ncMeta.metaGet2(
      context.workspace_id,
      context.base_id,
      MetaTable.AUTOMATION_ACTIONS,
      actionId,
    );

    return action ? new AutomationAction(action) : null;
  }

  public static async listByAutomationId(
    context: NcContext,
    automationId: string,
    ncMeta = Noco.ncMeta,
  ): Promise<AutomationAction[]> {
    const actions = await ncMeta.metaList2(
      context.workspace_id,
      context.base_id,
      MetaTable.AUTOMATION_ACTIONS,
      {
        condition: { fk_automation_id: automationId },
        orderBy: { order: 'asc' },
      },
    );

    return actions.map((a: any) => new AutomationAction(a));
  }

  public static async insert(
    context: NcContext,
    action: Partial<AutomationActionType>,
    ncMeta = Noco.ncMeta,
  ): Promise<AutomationAction> {
    const insertObj = extractProps(action, [
      'id',  // 支持保留前端传入的 ID
      'fk_automation_id',
      'type',
      'title',
      'order',
      'config',
      'on_error',
      'retry_count',
      'next_action_id',
    ]);

    // Serialize config to JSON string
    if (typeof insertObj.config === 'object') {
      insertObj.config = JSON.stringify(insertObj.config);
    }

    insertObj.base_id = context.base_id;
    insertObj.fk_workspace_id = context.workspace_id;

    const { id } = await ncMeta.metaInsert2(
      context.workspace_id,
      context.base_id,
      MetaTable.AUTOMATION_ACTIONS,
      insertObj,
    );

    return this.get(context, id, ncMeta) as Promise<AutomationAction>;
  }

  public static async bulkInsert(
    context: NcContext,
    automationId: string,
    actions: Partial<AutomationActionType>[],
    ncMeta = Noco.ncMeta,
  ): Promise<AutomationAction[]> {
    const results: AutomationAction[] = [];

    for (let i = 0; i < actions.length; i++) {
      const action = await this.insert(
        context,
        {
          ...actions[i],
          fk_automation_id: automationId,
          order: actions[i].order ?? i,
        },
        ncMeta,
      );
      results.push(action);
    }

    return results;
  }

  public static async update(
    context: NcContext,
    actionId: string,
    action: Partial<AutomationActionType>,
    ncMeta = Noco.ncMeta,
  ): Promise<AutomationAction> {
    const updateObj = extractProps(action, [
      'type',
      'title',
      'order',
      'config',
      'on_error',
      'retry_count',
      'next_action_id',
    ]);

    // Serialize config to JSON string
    if (typeof updateObj.config === 'object') {
      updateObj.config = JSON.stringify(updateObj.config);
    }

    await ncMeta.metaUpdate(
      context.workspace_id,
      context.base_id,
      MetaTable.AUTOMATION_ACTIONS,
      updateObj,
      actionId,
    );

    return this.get(context, actionId, ncMeta) as Promise<AutomationAction>;
  }

  public static async delete(
    context: NcContext,
    actionId: string,
    ncMeta = Noco.ncMeta,
  ): Promise<boolean> {
    await ncMeta.metaDelete(
      context.workspace_id,
      context.base_id,
      MetaTable.AUTOMATION_ACTIONS,
      actionId,
    );

    return true;
  }

  public static async deleteByAutomationId(
    context: NcContext,
    automationId: string,
    ncMeta = Noco.ncMeta,
  ): Promise<boolean> {
    await ncMeta.metaDelete(
      context.workspace_id,
      context.base_id,
      MetaTable.AUTOMATION_ACTIONS,
      { fk_automation_id: automationId },
    );

    return true;
  }

  public static async reorder(
    context: NcContext,
    automationId: string,
    actionIds: string[],
    ncMeta = Noco.ncMeta,
  ): Promise<void> {
    for (let i = 0; i < actionIds.length; i++) {
      await ncMeta.metaUpdate(
        context.workspace_id,
        context.base_id,
        MetaTable.AUTOMATION_ACTIONS,
        { order: i },
        actionIds[i],
      );
    }
  }
}
