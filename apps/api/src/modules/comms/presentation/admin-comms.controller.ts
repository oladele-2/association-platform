import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DomainErrorFilter } from '../../identity/presentation/domain-error.filter';
import { AccessJwtGuard } from '../../identity/presentation/access-jwt.guard';
import { CurrentAuthUser } from '../../identity/presentation/current-auth-user.decorator';
import type { AuthenticatedRequestUser } from '../../identity/presentation/access-jwt.guard';
import { TenantGuard, TENANT_HEADER } from '../../tenancy/presentation/tenant.guard';
import { CurrentTenant } from '../../tenancy/presentation/current-tenant.decorator';
import type { TenantContext } from '../../tenancy/domain/tenant-context';
import { PermissionsGuard } from '../../rbac/presentation/permissions.guard';
import { RequirePermissions } from '../../rbac/presentation/require-permissions.decorator';
import {
  CreateEmailCampaignUseCase,
  GetEmailCampaignUseCase,
  ListEmailCampaignsUseCase,
  ListEmailTemplatesUseCase,
  QueueEmailCampaignUseCase,
  UpsertEmailTemplateUseCase,
} from '../application/comms.use-cases';
import { CreateEmailCampaignDto, UpsertEmailTemplateDto } from './comms.dto';

@ApiTags('admin-comms')
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard, AccessJwtGuard, PermissionsGuard)
@UseFilters(DomainErrorFilter)
@Controller('admin')
export class AdminCommsController {
  constructor(
    private readonly listTemplates: ListEmailTemplatesUseCase,
    private readonly upsertTemplate: UpsertEmailTemplateUseCase,
    private readonly listCampaigns: ListEmailCampaignsUseCase,
    private readonly getCampaign: GetEmailCampaignUseCase,
    private readonly createCampaign: CreateEmailCampaignUseCase,
    private readonly queueCampaign: QueueEmailCampaignUseCase,
  ) {}

  @Get('email-templates')
  @RequirePermissions('comms.campaign')
  templates(@CurrentTenant() tenant: TenantContext) {
    return this.listTemplates.execute(tenant.organizationId);
  }

  @Put('email-templates')
  @RequirePermissions('comms.campaign')
  @ApiOperation({ summary: 'Create or update template by key' })
  putTemplate(@CurrentTenant() tenant: TenantContext, @Body() body: UpsertEmailTemplateDto) {
    return this.upsertTemplate.execute({
      organizationId: tenant.organizationId,
      ...body,
    });
  }

  @Get('email-campaigns')
  @RequirePermissions('comms.campaign')
  campaigns(@CurrentTenant() tenant: TenantContext) {
    return this.listCampaigns.execute(tenant.organizationId);
  }

  @Post('email-campaigns')
  @RequirePermissions('comms.campaign')
  create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Body() body: CreateEmailCampaignDto,
  ) {
    return this.createCampaign.execute({
      organizationId: tenant.organizationId,
      createdByUserId: auth.userId,
      ...body,
    });
  }

  @Get('email-campaigns/:id')
  @RequirePermissions('comms.campaign')
  get(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.getCampaign.execute(tenant.organizationId, id);
  }

  @Post('email-campaigns/:id/queue')
  @RequirePermissions('comms.campaign')
  @ApiOperation({ summary: 'Queue campaign and send via mock email provider (stub)' })
  queue(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.queueCampaign.execute(tenant.organizationId, id);
  }
}
