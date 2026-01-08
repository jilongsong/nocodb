import { Injectable, Logger } from '@nestjs/common';
import type { NcContext } from '~/interface/config';
import { Automation } from '~/models';
import type { AutomationTrigger } from '~/models/Automation';
import { AutomationsService } from '~/services/automations.service';

/**
 * 自动化触发服务
 * 负责监听数据事件并触发相关自动化
 */

// 用于防止自动化创建的记录再次触发自动化（防止无限循环）
const automationCreatedRecords = new Set<string>();

export type DataEventType = 'record.created' | 'record.updated' | 'record.deleted';

export interface DataEventPayload {
  tableId: string;
  recordId: string;
  record: Record<string, any>;
  previousRecord?: Record<string, any>;
  changedFields?: string[];
  userId?: string;
}

@Injectable()
export class AutomationTriggerService {
  private readonly logger = new Logger(AutomationTriggerService.name);

  constructor(
    private readonly automationsService: AutomationsService,
  ) {}

  /**
   * 处理数据事件，触发相关自动化
   */
  async handleDataEvent(
    context: NcContext,
    eventType: DataEventType,
    payload: DataEventPayload,
  ): Promise<void> {
    const { tableId, recordId, record, previousRecord, changedFields, userId } = payload;

    // 防止无限循环：检查该记录是否由自动化创建
    const recordKey = `${tableId}:${recordId}`;
    if (eventType === 'record.created' && automationCreatedRecords.has(recordKey)) {
      this.logger.log(`Skipping automation trigger for record ${recordId} (created by automation)`);
      automationCreatedRecords.delete(recordKey); // 清理标记
      return;
    }

    try {
      // 获取该表的所有活跃自动化
      const automations = await Automation.list(context, {
        fk_model_id: tableId,
      });

      const activeAutomations = automations.filter((a) => a.is_active);

      for (const automation of activeAutomations) {
        const trigger = automation.trigger as AutomationTrigger;
        
        // 检查触发器类型是否匹配
        if (!this.isTriggerMatch(trigger, eventType, changedFields)) {
          continue;
        }

        this.logger.log(
          `Triggering automation ${automation.id} for event ${eventType} on table ${tableId}`,
        );

        // 异步执行自动化（不阻塞当前操作）
        this.automationsService
          .executeSync(context, {
            automationId: automation.id!,
            triggerData: {
              event: eventType,
              record,
              previous_record: previousRecord,
              changed_fields: changedFields,
              record_id: recordId,
              table_id: tableId,
            },
            userId,
          })
          .catch((error) => {
            this.logger.error(
              `Failed to execute automation ${automation.id}: ${error.message}`,
              error.stack,
            );
          });
      }
    } catch (error: any) {
      this.logger.error(
        `Error handling data event ${eventType} for table ${tableId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 标记记录为自动化创建（防止无限循环）
   */
  static markAsAutomationCreated(tableId: string, recordId: string): void {
    const key = `${tableId}:${recordId}`;
    automationCreatedRecords.add(key);
    // 10秒后自动清理，防止内存泄漏
    setTimeout(() => automationCreatedRecords.delete(key), 10000);
  }

  /**
   * 检查触发器是否匹配事件类型
   */
  private isTriggerMatch(
    trigger: AutomationTrigger,
    eventType: DataEventType,
    changedFields?: string[],
  ): boolean {
    if (!trigger?.type) return false;

    switch (trigger.type) {
      case 'record.created':
        return eventType === 'record.created';

      case 'record.updated':
        return eventType === 'record.updated';

      case 'record.deleted':
        return eventType === 'record.deleted';

      case 'field.changed':
        if (eventType !== 'record.updated') return false;
        // 检查监听的字段是否发生变化
        const watchFields = trigger.config?.watch_fields || [];
        if (watchFields.length === 0) return true;
        if (!changedFields || changedFields.length === 0) return false;
        return watchFields.some((f: string) => changedFields.includes(f));

      default:
        return false;
    }
  }

  /**
   * 处理记录创建事件
   */
  async onRecordCreated(
    context: NcContext,
    tableId: string,
    recordId: string,
    record: Record<string, any>,
    userId?: string,
  ): Promise<void> {
    await this.handleDataEvent(context, 'record.created', {
      tableId,
      recordId,
      record,
      userId,
    });
  }

  /**
   * 处理记录更新事件
   */
  async onRecordUpdated(
    context: NcContext,
    tableId: string,
    recordId: string,
    record: Record<string, any>,
    previousRecord?: Record<string, any>,
    changedFields?: string[],
    userId?: string,
  ): Promise<void> {
    await this.handleDataEvent(context, 'record.updated', {
      tableId,
      recordId,
      record,
      previousRecord,
      changedFields,
      userId,
    });
  }

  /**
   * 处理记录删除事件
   */
  async onRecordDeleted(
    context: NcContext,
    tableId: string,
    recordId: string,
    record: Record<string, any>,
    userId?: string,
  ): Promise<void> {
    await this.handleDataEvent(context, 'record.deleted', {
      tableId,
      recordId,
      record,
      userId,
    });
  }
}
