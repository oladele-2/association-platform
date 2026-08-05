import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
import { AssertInstitutionAdminAccessUseCase } from '../../institutions/application/institution.use-cases';
import { ListPaymentsUseCase } from '../application/billing.use-cases';
import {
  CreateBulkRemittanceUseCase,
  GetBulkRemittanceUseCase,
  InitializeBulkRemittancePaystackUseCase,
  ListBulkRemittancesUseCase,
  SubmitBulkRemittanceEvidenceUseCase,
  SubmitBulkRemittanceUseCase,
} from '../application/remittance.use-cases';
import {
  CreateBulkRemittanceDto,
  InitializeBulkPaystackDto,
  RemittanceEvidenceDto,
} from './remittance.dto';

@ApiTags('institution-billing')
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard, AccessJwtGuard, PermissionsGuard)
@UseFilters(DomainErrorFilter)
@Controller('institution')
export class InstitutionBillingController {
  constructor(
    private readonly assertAdmin: AssertInstitutionAdminAccessUseCase,
    private readonly createRemittance: CreateBulkRemittanceUseCase,
    private readonly listRemittances: ListBulkRemittancesUseCase,
    private readonly getRemittance: GetBulkRemittanceUseCase,
    private readonly submitRemittance: SubmitBulkRemittanceUseCase,
    private readonly initPaystack: InitializeBulkRemittancePaystackUseCase,
    private readonly submitEvidence: SubmitBulkRemittanceEvidenceUseCase,
    private readonly listPayments: ListPaymentsUseCase,
  ) {}

  @Get('bulk-remittances')
  @RequirePermissions('payments.read')
  @ApiOperation({ summary: 'List remittances for an institution (institution admin)' })
  async list(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Query('institutionId', ParseUUIDPipe) institutionId: string,
  ) {
    await this.assertAdmin.execute(tenant.organizationId, institutionId, auth.userId);
    return this.listRemittances.execute({
      organizationId: tenant.organizationId,
      institutionId,
    });
  }

  @Post('bulk-remittances')
  @RequirePermissions('payments.read')
  async create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Body() body: CreateBulkRemittanceDto,
  ) {
    await this.assertAdmin.execute(tenant.organizationId, body.institutionId, auth.userId);
    return this.createRemittance.execute({
      organizationId: tenant.organizationId,
      institutionId: body.institutionId,
      periodLabel: body.periodLabel,
      createdByUserId: auth.userId,
      lines: body.lines,
    });
  }

  @Get('bulk-remittances/:id')
  @RequirePermissions('payments.read')
  async get(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const row = await this.getRemittance.execute(tenant.organizationId, id);
    await this.assertAdmin.execute(tenant.organizationId, row.institutionId, auth.userId);
    return row;
  }

  @Post('bulk-remittances/:id/submit')
  @RequirePermissions('payments.read')
  async submit(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const row = await this.getRemittance.execute(tenant.organizationId, id);
    await this.assertAdmin.execute(tenant.organizationId, row.institutionId, auth.userId);
    return this.submitRemittance.execute(tenant.organizationId, id);
  }

  @Post('bulk-remittances/:id/paystack/initialize')
  @RequirePermissions('payments.read')
  async paystack(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: InitializeBulkPaystackDto,
  ) {
    const row = await this.getRemittance.execute(tenant.organizationId, id);
    await this.assertAdmin.execute(tenant.organizationId, row.institutionId, auth.userId);
    return this.initPaystack.execute({
      organizationId: tenant.organizationId,
      remittanceId: id,
      userId: auth.userId,
      email: body.email,
      idempotencyKey: body.idempotencyKey,
      callbackUrl: body.callbackUrl,
    });
  }

  @Post('bulk-remittances/:id/evidence')
  @RequirePermissions('payments.read')
  async evidence(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RemittanceEvidenceDto,
  ) {
    const row = await this.getRemittance.execute(tenant.organizationId, id);
    await this.assertAdmin.execute(tenant.organizationId, row.institutionId, auth.userId);
    return this.submitEvidence.execute({
      organizationId: tenant.organizationId,
      remittanceId: id,
      userId: auth.userId,
      ...body,
    });
  }

  @Get('payments')
  @RequirePermissions('payments.read')
  async payments(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Query('institutionId', ParseUUIDPipe) institutionId: string,
  ) {
    await this.assertAdmin.execute(tenant.organizationId, institutionId, auth.userId);
    return this.listPayments.execute({
      organizationId: tenant.organizationId,
      institutionId,
      limit: 100,
    });
  }
}
