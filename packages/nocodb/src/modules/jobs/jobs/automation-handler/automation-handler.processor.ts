import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import type { HandleAutomationJobData } from '~/interface/Jobs';
import { AutomationExecutorService } from '~/services/automation-executor.service';

/**
 * 自动化任务处理器
 * 处理异步自动化执行任务
 */
export class AutomationHandlerProcessor {
  protected logger = new Logger(AutomationHandlerProcessor.name);

  constructor(
    private readonly automationExecutor: AutomationExecutorService,
  ) {}

  async job(job: Job<HandleAutomationJobData>) {
    const { context, automationId, triggerData, testMode } = job.data;

    this.logger.log(
      `Processing automation job: ${automationId}, testMode: ${testMode}`,
    );

    try {
      const result = await this.automationExecutor.execute(context, {
        automationId,
        triggerData,
        testMode,
        userId: job.data.user?.id,
      });

      if (result.success) {
        this.logger.log(
          `Automation ${automationId} executed successfully, logId: ${result.logId}`,
        );
      } else {
        this.logger.warn(
          `Automation ${automationId} execution failed: ${result.error}`,
        );
      }

      return result;
    } catch (error: any) {
      this.logger.error(
        `Error processing automation ${automationId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
