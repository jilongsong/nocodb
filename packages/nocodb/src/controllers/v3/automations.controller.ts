import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GlobalGuard } from '~/guards/global/global.guard';
import { PagedResponseImpl } from '~/helpers/PagedResponse';
import { AutomationsService } from '~/services/automations.service';
import { Acl } from '~/middlewares/extract-ids/extract-ids.middleware';
import { MetaApiLimiterGuard } from '~/guards/meta-api-limiter.guard';
import { TenantContext } from '~/decorators/tenant-context.decorator';
import { NcContext, NcRequest } from '~/interface/config';
import { PREFIX_APIV3_METABASE } from '~/constants/controllers';

@Controller()
@UseGuards(MetaApiLimiterGuard, GlobalGuard)
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Get(`${PREFIX_APIV3_METABASE}/automations`)
  @Acl('automationList')
  async list(
    @TenantContext() context: NcContext,
    @Param('baseId') baseId: string,
    @Query('tableId') tableId?: string,
    @Query('fk_model_id') fkModelId?: string,
  ) {
    // 支持前端传入 fk_model_id 或 tableId
    const modelId = fkModelId || tableId;
    return new PagedResponseImpl(
      await this.automationsService.list(context, { baseId, tableId: modelId }),
    );
  }

  @Get(`${PREFIX_APIV3_METABASE}/automations/:automationId`)
  @Acl('automationGet')
  async get(
    @TenantContext() context: NcContext,
    @Param('automationId') automationId: string,
  ) {
    return await this.automationsService.get(context, automationId);
  }

  @Post(`${PREFIX_APIV3_METABASE}/automations`)
  @Acl('automationCreate')
  async create(
    @TenantContext() context: NcContext,
    @Param('baseId') baseId: string,
    @Body() body: any,
    @Req() req: NcRequest,
  ) {
    return await this.automationsService.create(context, {
      baseId,
      automation: body,
      req,
    });
  }

  @Patch(`${PREFIX_APIV3_METABASE}/automations/:automationId`)
  @Acl('automationUpdate')
  async update(
    @TenantContext() context: NcContext,
    @Param('automationId') automationId: string,
    @Body() body: any,
    @Req() req: NcRequest,
  ) {
    return await this.automationsService.update(context, {
      automationId,
      automation: body,
      req,
    });
  }

  @Delete(`${PREFIX_APIV3_METABASE}/automations/:automationId`)
  @Acl('automationDelete')
  async delete(
    @TenantContext() context: NcContext,
    @Param('automationId') automationId: string,
    @Req() req: NcRequest,
  ) {
    return await this.automationsService.delete(context, {
      automationId,
      req,
    });
  }

  @Patch(`${PREFIX_APIV3_METABASE}/automations/:automationId/toggle`)
  @Acl('automationUpdate')
  async toggleActive(
    @TenantContext() context: NcContext,
    @Param('automationId') automationId: string,
    @Body('is_active') isActive: boolean,
    @Req() req: NcRequest,
  ) {
    return await this.automationsService.toggleActive(context, {
      automationId,
      isActive,
      req,
    });
  }

  @Post(`${PREFIX_APIV3_METABASE}/automations/:automationId/duplicate`)
  @Acl('automationCreate')
  async duplicate(
    @TenantContext() context: NcContext,
    @Param('automationId') automationId: string,
    @Req() req: NcRequest,
  ) {
    return await this.automationsService.duplicate(context, {
      automationId,
      req,
    });
  }

  @Post(`${PREFIX_APIV3_METABASE}/automations/:automationId/test`)
  @Acl('automationUpdate')
  async test(
    @TenantContext() context: NcContext,
    @Param('automationId') automationId: string,
    @Body() body: Record<string, any>,
    @Req() req: NcRequest,
  ) {
    // 支持 testData 或 record_data 参数
    const testData = body.testData || body.record_data || body;
    return await this.automationsService.test(context, {
      automationId,
      testData,
      req,
    });
  }

  @Post(`${PREFIX_APIV3_METABASE}/automations/:automationId/trigger`)
  @Acl('automationUpdate')
  async trigger(
    @TenantContext() context: NcContext,
    @Param('automationId') automationId: string,
    @Body() body: Record<string, any>,
    @Req() req: NcRequest,
  ) {
    // 支持 triggerData 或 record_id 参数
    const triggerData = body.triggerData || { record_id: body.record_id, record: body.record };
    return await this.automationsService.trigger(context, {
      automationId,
      triggerData,
      req,
    });
  }

  @Get(`${PREFIX_APIV3_METABASE}/automations/:automationId/logs`)
  @Acl('automationGet')
  async getLogs(
    @TenantContext() context: NcContext,
    @Param('automationId') automationId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    // 支持 page/pageSize 或 limit/offset 分页方式
    let finalLimit = limit ? parseInt(limit, 10) : 50;
    let finalOffset = offset ? parseInt(offset, 10) : 0;

    if (page && pageSize) {
      finalLimit = parseInt(pageSize, 10);
      finalOffset = (parseInt(page, 10) - 1) * finalLimit;
    }

    const result = await this.automationsService.getLogs(context, {
      automationId,
      limit: finalLimit,
      offset: finalOffset,
    });

    return new PagedResponseImpl(result.list, {
      count: result.count,
      limit: finalLimit,
      offset: finalOffset,
    });
  }

  @Get(`${PREFIX_APIV3_METABASE}/automation-logs/:logId`)
  @Acl('automationGet')
  async getLogDetail(
    @TenantContext() context: NcContext,
    @Param('logId') logId: string,
  ) {
    return await this.automationsService.getLogDetail(context, logId);
  }
}
