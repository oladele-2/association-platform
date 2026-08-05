import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DomainErrorFilter } from '../../identity/presentation/domain-error.filter';
import { AccessJwtGuard } from '../../identity/presentation/access-jwt.guard';
import { CurrentAuthUser } from '../../identity/presentation/current-auth-user.decorator';
import type { AuthenticatedRequestUser } from '../../identity/presentation/access-jwt.guard';
import { TenantGuard, TENANT_HEADER } from '../../tenancy/presentation/tenant.guard';
import { CurrentTenant } from '../../tenancy/presentation/current-tenant.decorator';
import type { TenantContext } from '../../tenancy/domain/tenant-context';
import { PermissionsGuard } from '../../rbac/presentation/permissions.guard';
import { RequirePermissions } from '../../rbac/presentation/require-permissions.decorator';
import type { InvoiceStatus, PaymentStatus } from '../domain/billing.rules';
import {
  ActivateFeeScheduleUseCase,
  CreateFeeRuleUseCase,
  CreateFeeScheduleUseCase,
  DeleteFeeRuleUseCase,
  GenerateInvoicesUseCase,
  GetFeeScheduleUseCase,
  GetInvoiceUseCase,
  GetPaymentUseCase,
  ListFeeSchedulesUseCase,
  ListInvoicesUseCase,
  ListPaymentsUseCase,
  RejectPaymentUseCase,
  UpdateFeeRuleUseCase,
  UpdateFeeScheduleUseCase,
  VerifyPaymentUseCase,
  VoidInvoiceUseCase,
  WaiveInvoiceUseCase,
} from '../application/billing.use-cases';
import {
  GetBulkRemittanceUseCase,
  ListBulkRemittancesUseCase,
  ResolveBulkRemittanceLineUseCase,
} from '../application/remittance.use-cases';
import {
  CreateFeeRuleDto,
  CreateFeeScheduleDto,
  INVOICE_STATUSES,
  PAYMENT_STATUSES,
  RejectPaymentDto,
  UpdateFeeRuleDto,
  UpdateFeeScheduleDto,
  WaiveInvoiceDto,
} from './billing.dto';
import { ResolveRemittanceLineDto } from './remittance.dto';

@ApiTags('admin-billing')
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard, AccessJwtGuard, PermissionsGuard)
@UseFilters(DomainErrorFilter)
@Controller('admin')
export class AdminBillingController {
  constructor(
    private readonly listSchedules: ListFeeSchedulesUseCase,
    private readonly getSchedule: GetFeeScheduleUseCase,
    private readonly createSchedule: CreateFeeScheduleUseCase,
    private readonly updateSchedule: UpdateFeeScheduleUseCase,
    private readonly activateSchedule: ActivateFeeScheduleUseCase,
    private readonly createRule: CreateFeeRuleUseCase,
    private readonly updateRule: UpdateFeeRuleUseCase,
    private readonly deleteRule: DeleteFeeRuleUseCase,
    private readonly generateInvoices: GenerateInvoicesUseCase,
    private readonly listInvoices: ListInvoicesUseCase,
    private readonly getInvoice: GetInvoiceUseCase,
    private readonly waiveInvoice: WaiveInvoiceUseCase,
    private readonly voidInvoice: VoidInvoiceUseCase,
    private readonly listPayments: ListPaymentsUseCase,
    private readonly getPayment: GetPaymentUseCase,
    private readonly verifyPayment: VerifyPaymentUseCase,
    private readonly rejectPayment: RejectPaymentUseCase,
    private readonly listRemittances: ListBulkRemittancesUseCase,
    private readonly getRemittance: GetBulkRemittanceUseCase,
    private readonly resolveLine: ResolveBulkRemittanceLineUseCase,
  ) {}

  @Get('fee-schedules')
  @RequirePermissions('payments.read')
  schedules(@CurrentTenant() tenant: TenantContext) {
    return this.listSchedules.execute(tenant.organizationId);
  }

  @Post('fee-schedules')
  @RequirePermissions('payments.verify')
  createSched(@CurrentTenant() tenant: TenantContext, @Body() body: CreateFeeScheduleDto) {
    return this.createSchedule.execute({
      organizationId: tenant.organizationId,
      ...body,
    });
  }

  @Get('fee-schedules/:id')
  @RequirePermissions('payments.read')
  getSched(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.getSchedule.execute(tenant.organizationId, id);
  }

  @Patch('fee-schedules/:id')
  @RequirePermissions('payments.verify')
  updateSched(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateFeeScheduleDto,
  ) {
    return this.updateSchedule.execute({
      organizationId: tenant.organizationId,
      id,
      ...body,
    });
  }

  @Post('fee-schedules/:id/activate')
  @RequirePermissions('payments.verify')
  @ApiOperation({ summary: 'Activate draft fee schedule (requires ≥1 rule)' })
  activate(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.activateSchedule.execute(tenant.organizationId, id);
  }

  @Post('fee-schedules/:id/rules')
  @RequirePermissions('payments.verify')
  addRule(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateFeeRuleDto,
  ) {
    return this.createRule.execute({
      organizationId: tenant.organizationId,
      feeScheduleId: id,
      ...body,
    });
  }

  @Patch('fee-schedules/:id/rules/:ruleId')
  @RequirePermissions('payments.verify')
  patchRule(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Body() body: UpdateFeeRuleDto,
  ) {
    return this.updateRule.execute({
      organizationId: tenant.organizationId,
      feeScheduleId: id,
      ruleId,
      ...body,
    });
  }

  @Delete('fee-schedules/:id/rules/:ruleId')
  @RequirePermissions('payments.verify')
  removeRule(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
  ) {
    return this.deleteRule.execute(tenant.organizationId, id, ruleId);
  }

  @Post('fee-schedules/:id/generate-invoices')
  @RequirePermissions('payments.verify')
  @ApiOperation({ summary: 'Generate open invoices for active members from fee rules' })
  generate(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.generateInvoices.execute(tenant.organizationId, id);
  }

  @Get('invoices')
  @RequirePermissions('payments.read')
  @ApiQuery({ name: 'status', required: false, enum: INVOICE_STATUSES })
  @ApiQuery({ name: 'memberId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  invoices(
    @CurrentTenant() tenant: TenantContext,
    @Query('status') status?: InvoiceStatus,
    @Query('memberId') memberId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listInvoices.execute({
      organizationId: tenant.organizationId,
      status,
      memberId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('invoices/:id')
  @RequirePermissions('payments.read')
  invoice(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.getInvoice.execute(tenant.organizationId, id);
  }

  @Post('invoices/:id/waive')
  @RequirePermissions('payments.verify')
  waive(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: WaiveInvoiceDto,
  ) {
    return this.waiveInvoice.execute(tenant.organizationId, id, body.reason);
  }

  @Post('invoices/:id/void')
  @RequirePermissions('payments.verify')
  voidInv(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.voidInvoice.execute(tenant.organizationId, id);
  }

  @Get('payments')
  @RequirePermissions('payments.read')
  @ApiQuery({ name: 'status', required: false, enum: PAYMENT_STATUSES })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  payments(
    @CurrentTenant() tenant: TenantContext,
    @Query('status') status?: PaymentStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listPayments.execute({
      organizationId: tenant.organizationId,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('payments/:id')
  @RequirePermissions('payments.read')
  payment(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.getPayment.execute(tenant.organizationId, id);
  }

  @Post('payments/:id/verify')
  @RequirePermissions('payments.verify')
  @ApiOperation({ summary: 'Verify manual payment → succeed + allocate + receipt' })
  verify(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.verifyPayment.execute(tenant.organizationId, id, auth.userId);
  }

  @Post('payments/:id/reject')
  @RequirePermissions('payments.verify')
  reject(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RejectPaymentDto,
  ) {
    return this.rejectPayment.execute(tenant.organizationId, id, auth.userId, body.reason);
  }

  @Get('bulk-remittances')
  @RequirePermissions('payments.read')
  listBulk(@CurrentTenant() tenant: TenantContext, @Query('institutionId') institutionId?: string) {
    return this.listRemittances.execute({
      organizationId: tenant.organizationId,
      institutionId,
    });
  }

  @Get('bulk-remittances/:id')
  @RequirePermissions('payments.read')
  getBulk(@CurrentTenant() tenant: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.getRemittance.execute(tenant.organizationId, id);
  }

  @Post('bulk-remittances/:id/lines/:lineId/resolve')
  @RequirePermissions('payments.verify')
  @ApiOperation({ summary: 'Match, unmatch, or exclude an unmatched remittance line' })
  resolve(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
    @Body() body: ResolveRemittanceLineDto,
  ) {
    return this.resolveLine.execute({
      organizationId: tenant.organizationId,
      remittanceId: id,
      lineId,
      ...body,
    });
  }
}
