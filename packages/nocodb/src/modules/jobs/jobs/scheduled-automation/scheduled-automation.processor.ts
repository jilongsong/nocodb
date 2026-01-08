import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bull';
import type { ScheduledAutomationJobData } from '~/interface/Jobs';
import { Automation } from '~/models';
import { AutomationExecutorService } from '~/services/automation-executor.service';

@Injectable()
export class ScheduledAutomationProcessor {
  private logger = new Logger(ScheduledAutomationProcessor.name);

  constructor(private readonly automationExecutor: AutomationExecutorService) {}

  async job(job: Job<ScheduledAutomationJobData>) {
    const { context, automationId, cronExpression, timezone } = job.data;

    this.logger.log(`Executing scheduled automation ${automationId}`);

    try {
      // 获取自动化信息，检查是否仍然有效
      const automation = await Automation.get(context, automationId);
      
      if (!automation) {
        this.logger.warn(`Automation ${automationId} not found, skipping execution`);
        return { success: false, error: 'Automation not found' };
      }

      if (!automation.is_active) {
        this.logger.log(`Automation ${automationId} is inactive, skipping execution`);
        return { success: false, error: 'Automation is inactive' };
      }

      // 执行自动化
      const result = await this.automationExecutor.execute(context, {
        automationId,
        triggerData: {
          event: 'scheduled',
          scheduled_time: new Date().toISOString(),
          cron_expression: cronExpression,
          timezone: timezone || 'Asia/Shanghai',
        },
        testMode: false,
      });

      if (result.success) {
        this.logger.log(`Scheduled automation ${automationId} executed successfully`);
      } else {
        this.logger.warn(`Scheduled automation ${automationId} failed: ${result.error}`);
      }

      return result;
    } catch (error: any) {
      this.logger.error(
        `Error executing scheduled automation ${automationId}: ${error.message}`,
        error.stack,
      );
      return { success: false, error: error.message };
    }
  }
}
