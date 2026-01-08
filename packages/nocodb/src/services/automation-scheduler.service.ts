import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { NcContext } from '~/interface/config';
import { Automation } from '~/models';
import type { AutomationTrigger } from '~/models/Automation';
import { IJobsService } from '~/modules/jobs/jobs-service.interface';
import { JobTypes } from '~/interface/Jobs';
import Noco from '~/Noco';

/**
 * 调度触发器配置
 */
interface ScheduledTriggerConfig {
  cron_expression?: string;   // Cron 表达式，如 "0 9 * * *" (每天9点)
  interval_minutes?: number;  // 间隔分钟数
  timezone?: string;          // 时区，如 "Asia/Shanghai"
  start_date?: string;        // 开始日期
  end_date?: string;          // 结束日期
}

/**
 * 生成调度任务的唯一 Job ID
 */
function getScheduledJobId(automationId: string): string {
  return `scheduled-automation-${automationId}`;
}

/**
 * 自动化调度服务
 * 使用 BullMQ 重复任务实现可靠的定时调度
 * 
 * 优点:
 * - 任务持久化在 Redis，服务重启自动恢复
 * - 支持多实例部署，自动防止重复执行
 * - 原生支持 Cron 表达式
 */
@Injectable()
export class AutomationSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(AutomationSchedulerService.name);
  
  // 记录已调度的任务 ID (用于管理)
  private scheduledJobIds: Set<string> = new Set();

  constructor(
    @Inject('JobsService') private readonly jobsService: IJobsService,
  ) {}

  /**
   * 模块初始化时启动调度器
   */
  async onModuleInit() {
    this.logger.log('Initializing automation scheduler (BullMQ mode)...');
    
    // 延迟启动，等待数据库和 Redis 连接就绪
    setTimeout(() => {
      this.loadScheduledAutomations().catch((err) => {
        this.logger.error('Failed to load scheduled automations:', err);
      });
    }, 5000);
  }

  /**
   * 加载所有定时自动化并添加到 BullMQ
   */
  private async loadScheduledAutomations(): Promise<void> {
    let loadedCount = 0;
    
    try {
      // 获取所有 base
      const ncMeta = Noco.ncMeta;
      const bases = await ncMeta.metaList2(null, null, 'nc_bases_v2');

      for (const base of bases) {
        const context: NcContext = {
          workspace_id: base.fk_workspace_id,
          base_id: base.id,
        };

        // 获取该 base 下的所有自动化
        const automations = await Automation.list(context, {});

        for (const automation of automations) {
          if (automation.is_active && this.isScheduledTrigger(automation.trigger)) {
            await this.scheduleAutomation(context, automation);
            loadedCount++;
          }
        }
      }
      
      this.logger.log(`Scheduler initialized with ${loadedCount} scheduled automations`);
    } catch (error: any) {
      this.logger.error(`Failed to load scheduled automations: ${error.message}`);
    }
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

  /**
   * 调度单个自动化 (添加到 BullMQ 重复任务)
   */
  async scheduleAutomation(context: NcContext, automation: any): Promise<void> {
    const trigger = automation.trigger as AutomationTrigger;
    const config = trigger?.config as ScheduledTriggerConfig;

    // 处理间隔触发器：将间隔分钟转换为 cron 表达式
    let cronExpression = config?.cron_expression;
    if (trigger?.type === 'schedule.interval' && config?.interval_minutes) {
      cronExpression = this.intervalToCron(config.interval_minutes);
    }

    if (!cronExpression) {
      this.logger.warn(`Automation ${automation.id} has no cron expression or interval`);
      return;
    }

    // 检查是否在有效日期范围内
    if (config?.end_date && new Date(config.end_date) < new Date()) {
      this.logger.log(`Automation ${automation.id} has passed end date, skipping`);
      return;
    }

    try {
      const jobId = getScheduledJobId(automation.id);
      
      // 添加 BullMQ 重复任务
      await this.jobsService.add(
        JobTypes.ScheduledAutomation,
        {
          context,
          automationId: automation.id,
          cronExpression,
          timezone: config?.timezone || 'Asia/Shanghai',
        },
        {
          jobId,
          repeat: {
            cron: cronExpression,
            // BullMQ 支持时区设置
            // tz: config?.timezone || 'Asia/Shanghai',
          },
        },
      );

      this.scheduledJobIds.add(automation.id);

      this.logger.log(
        `Scheduled automation ${automation.id} with cron "${cronExpression}" via BullMQ`
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to schedule automation ${automation.id}: ${error.message}`
      );
    }
  }

  /**
   * 取消自动化调度 (从 BullMQ 移除重复任务)
   */
  async unscheduleAutomation(automationId: string): Promise<void> {
    try {
      const jobId = getScheduledJobId(automationId);
      
      // 移除 BullMQ 重复任务
      // BullMQ 的 removeRepeatable 需要通过 Queue 实例调用
      // 这里通过 jobsService 暴露的方法来处理
      if (this.jobsService.removeRepeatableJob) {
        await this.jobsService.removeRepeatableJob(jobId);
      }

      this.scheduledJobIds.delete(automationId);
      this.logger.log(`Unscheduled automation ${automationId}`);
    } catch (error: any) {
      this.logger.error(`Failed to unschedule automation ${automationId}: ${error.message}`);
    }
  }

  /**
   * 重新调度自动化 (用于更新后)
   */
  async rescheduleAutomation(context: NcContext, automation: any): Promise<void> {
    // 先取消现有调度
    await this.unscheduleAutomation(automation.id);

    // 如果仍然是活跃的定时自动化，重新调度
    if (automation.is_active && this.isScheduledTrigger(automation.trigger)) {
      await this.scheduleAutomation(context, automation);
    }
  }

  /**
   * 获取所有已调度的自动化 ID
   */
  getScheduledAutomationIds(): string[] {
    return Array.from(this.scheduledJobIds);
  }

  /**
   * 检查自动化是否已调度
   */
  isScheduled(automationId: string): boolean {
    return this.scheduledJobIds.has(automationId);
  }

  /**
   * 将间隔分钟转换为 Cron 表达式
   */
  private intervalToCron(intervalMinutes: number): string {
    if (intervalMinutes <= 0) {
      return '* * * * *'; // 每分钟
    }

    if (intervalMinutes < 60) {
      // 每 N 分钟
      return `*/${intervalMinutes} * * * *`;
    }

    const hours = Math.floor(intervalMinutes / 60);
    const minutes = intervalMinutes % 60;

    if (hours < 24) {
      // 每 N 小时
      if (minutes === 0) {
        return `0 */${hours} * * *`;
      } else {
        return `${minutes} */${hours} * * *`;
      }
    }

    // 超过24小时，按天计算
    const days = Math.floor(hours / 24);
    return `0 0 */${days} * *`;
  }
}
