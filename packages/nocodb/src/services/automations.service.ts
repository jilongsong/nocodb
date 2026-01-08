import { Inject, Injectable, forwardRef } from '@nestjs/common';
import type { NcContext, NcRequest } from '~/interface/config';
import { NcError } from '~/helpers/catchError';
import { Automation, AutomationAction, AutomationLog, Model } from '~/models';
import type { AutomationType } from '~/models/Automation';
import type { AutomationActionType } from '~/models/AutomationAction';
import { AutomationExecutorService } from '~/services/automation-executor.service';
import { AutomationSchedulerService } from '~/services/automation-scheduler.service';
import { IJobsService } from '~/modules/jobs/jobs-service.interface';
import { JobTypes } from '~/interface/Jobs';

export interface CreateAutomationRequest {
  title: string;
  description?: string;
  fk_model_id: string;
  trigger: {
    type: string;
    config: Record<string, any>;
    conditions?: Record<string, any>;
  };
  actions?: Partial<AutomationActionType>[];
  is_active?: boolean;
}

export interface UpdateAutomationRequest {
  title?: string;
  description?: string;
  trigger?: {
    id?: string;
    type: string;
    config: Record<string, any>;
    conditions?: Record<string, any>;
  };
  actions?: Partial<AutomationActionType>[];
  is_active?: boolean;
}

@Injectable()
export class AutomationsService {
  constructor(
    private readonly automationExecutor: AutomationExecutorService,
    @Inject('JobsService') private readonly jobsService: IJobsService,
    @Inject(forwardRef(() => AutomationSchedulerService))
    private readonly automationScheduler: AutomationSchedulerService,
  ) {}

  async list(
    context: NcContext,
    param: { baseId: string; tableId?: string },
  ) {
    const condition: { base_id?: string; fk_model_id?: string } = {};

    if (param.baseId) {
      condition.base_id = param.baseId;
    }

    if (param.tableId) {
      condition.fk_model_id = param.tableId;
    }

    const automations = await Automation.list(context, condition);

    // Load actions for each automation
    const result = await Promise.all(
      automations.map(async (automation) => {
        const actions = await AutomationAction.listByAutomationId(
          context,
          automation.id!,
        );
        return {
          ...automation,
          actions,
        };
      }),
    );

    return result;
  }

  async get(context: NcContext, automationId: string) {
    const automation = await Automation.get(context, automationId);
    if (!automation) {
      NcError.genericNotFound('Automation', automationId);
    }

    // Load actions
    const actions = await AutomationAction.listByAutomationId(
      context,
      automationId,
    );

    return {
      ...automation,
      actions,
    };
  }

  async create(
    context: NcContext,
    param: {
      baseId: string;
      automation: CreateAutomationRequest;
      req: NcRequest;
    },
  ) {
    const { automation: automationData } = param;

    // Validate table exists (optional - skip if table ID looks like a placeholder)
    if (automationData.fk_model_id && !automationData.fk_model_id.startsWith('default')) {
      const model = await Model.get(context, automationData.fk_model_id);
      if (!model) {
        NcError.tableNotFound(automationData.fk_model_id);
      }
    }

    // Create trigger object with ID
    const trigger = {
      id: `trigger-${Date.now()}`,
      type: automationData.trigger.type,
      config: automationData.trigger.config || {},
      conditions: automationData.trigger.conditions,
    };

    // Create automation
    const automation = await Automation.insert(context, {
      ...automationData,
      trigger,
      is_active: automationData.is_active ?? true,
      status: 'inactive',
      created_by: (param.req as any)?.user?.id,
    });

    // Create actions if provided
    if (automationData.actions?.length) {
      await AutomationAction.bulkInsert(
        context,
        automation.id!,
        automationData.actions,
      );
    }

    // 如果是定时自动化，添加到调度器
    const fullAutomation = await this.get(context, automation.id!);
    if (this.isScheduledTrigger(fullAutomation.trigger)) {
      await this.automationScheduler.scheduleAutomation(context, fullAutomation);
    }

    return fullAutomation;
  }

  async update(
    context: NcContext,
    param: {
      automationId: string;
      automation: UpdateAutomationRequest;
      req: NcRequest;
    },
  ) {
    const { automationId, automation: automationData } = param;

    // Check automation exists
    const existingAutomation = await Automation.get(context, automationId);
    if (!existingAutomation) {
      NcError.genericNotFound('Automation', automationId);
    }

    // Prepare update object
    const updateObj: Partial<AutomationType> = {};

    if (automationData.title !== undefined) {
      updateObj.title = automationData.title;
    }

    if (automationData.description !== undefined) {
      updateObj.description = automationData.description;
    }

    if (automationData.is_active !== undefined) {
      updateObj.is_active = automationData.is_active;
      updateObj.status = automationData.is_active ? 'active' : 'inactive';
    }

    if (automationData.trigger) {
      updateObj.trigger = {
        id: automationData.trigger.id || (existingAutomation.trigger as any)?.id || `trigger-${Date.now()}`,
        type: automationData.trigger.type,
        config: automationData.trigger.config || {},
        conditions: automationData.trigger.conditions,
      };
    }

    // Update automation
    await Automation.update(context, automationId, updateObj);

    // Update actions if provided
    if (automationData.actions) {
      // Delete existing actions
      await AutomationAction.deleteByAutomationId(context, automationId);

      // Insert new actions
      if (automationData.actions.length > 0) {
        await AutomationAction.bulkInsert(
          context,
          automationId,
          automationData.actions,
        );
      }
    }

    // 重新调度自动化
    const updatedAutomation = await this.get(context, automationId);
    await this.automationScheduler.rescheduleAutomation(context, updatedAutomation);

    return updatedAutomation;
  }

  async delete(
    context: NcContext,
    param: { automationId: string; req: NcRequest },
  ) {
    const { automationId } = param;

    // 从调度器移除
    this.automationScheduler.unscheduleAutomation(automationId);

    await Automation.delete(context, automationId);

    return { deleted: true };
  }

  async toggleActive(
    context: NcContext,
    param: { automationId: string; isActive: boolean; req: NcRequest },
  ) {
    const { automationId, isActive } = param;

    await Automation.update(context, automationId, {
      is_active: isActive,
      status: isActive ? 'active' : 'inactive',
    });

    // 重新调度自动化
    const automation = await this.get(context, automationId);
    await this.automationScheduler.rescheduleAutomation(context, automation);

    return automation;
  }

  /**
   * 检查触发器是否为定时类型
   */
  private isScheduledTrigger(trigger: any): boolean {
    return (
      trigger?.type === 'scheduled' ||
      trigger?.type === 'cron' ||
      trigger?.type === 'schedule.cron' ||
      trigger?.type === 'schedule.interval'
    );
  }

  async duplicate(
    context: NcContext,
    param: { automationId: string; req: NcRequest },
  ) {
    const { automationId } = param;

    // Get existing automation with actions
    const existing = await this.get(context, automationId);

    // Create new automation
    const newAutomation = await this.create(context, {
      baseId: existing.base_id!,
      automation: {
        title: `${existing.title} (副本)`,
        description: existing.description,
        fk_model_id: existing.fk_model_id!,
        trigger: existing.trigger as any,
        actions: (existing as any).actions?.map((a: any) => ({
          type: a.type,
          title: a.title,
          order: a.order,
          config: a.config,
          on_error: a.on_error,
          retry_count: a.retry_count,
        })),
        is_active: false,
      },
      req: param.req,
    });

    return newAutomation;
  }

  async test(
    context: NcContext,
    param: {
      automationId: string;
      testData?: Record<string, any>;
      req: NcRequest;
    },
  ) {
    const { automationId, testData } = param;

    const automation = await this.get(context, automationId);
    if (!automation) {
      NcError.genericNotFound('Automation', automationId);
    }

    // 执行自动化（测试模式）
    const result = await this.automationExecutor.execute(context, {
      automationId,
      triggerData: testData || { test: true, record: {} },
      testMode: true,
      userId: (param.req as any)?.user?.id,
    });

    return {
      success: result.success,
      logId: result.logId,
      message: result.success ? 'Test execution completed' : result.error,
    };
  }

  async trigger(
    context: NcContext,
    param: {
      automationId: string;
      triggerData: Record<string, any>;
      req: NcRequest;
    },
  ) {
    const { automationId, triggerData } = param;

    const automation = await this.get(context, automationId);

    if (!automation || !automation.is_active) {
      NcError.badRequest('Automation not found or is not active');
    }

    // 将自动化执行任务加入队列（异步执行）
    await this.jobsService.add(JobTypes.HandleAutomation, {
      context,
      automationId,
      triggerData,
      testMode: false,
      user: (param.req as any)?.user,
    });

    return {
      success: true,
      message: 'Automation triggered successfully',
    };
  }

  /**
   * 同步执行自动化（用于事件触发）
   */
  async executeSync(
    context: NcContext,
    param: {
      automationId: string;
      triggerData: Record<string, any>;
      userId?: string;
    },
  ) {
    return this.automationExecutor.execute(context, {
      automationId: param.automationId,
      triggerData: param.triggerData,
      testMode: false,
      userId: param.userId,
    });
  }

  async getLogs(
    context: NcContext,
    param: {
      automationId: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const { automationId, limit = 50, offset = 0 } = param;

    // Verify automation exists
    const automation = await Automation.get(context, automationId);
    if (!automation) {
      NcError.genericNotFound('Automation', automationId);
    }

    return AutomationLog.list(context, {
      fk_automation_id: automationId,
      limit,
      offset,
    });
  }

  async getLogDetail(context: NcContext, logId: string) {
    const log = await AutomationLog.get(context, logId);
    if (!log) {
      NcError.genericNotFound('AutomationLog', logId);
    }
    return log;
  }
}
