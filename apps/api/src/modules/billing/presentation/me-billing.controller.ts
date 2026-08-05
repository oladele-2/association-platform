import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
import {
  InitializePaystackPaymentUseCase,
  ListMyBillingUseCase,
  SubmitManualPaymentUseCase,
} from '../application/billing.use-cases';
import { InitializePaystackDto, ManualPaymentDto } from './billing.dto';

@ApiTags('me-billing')
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: false })
@UseGuards(TenantGuard, AccessJwtGuard)
@UseFilters(DomainErrorFilter)
@Controller('me')
export class MeBillingController {
  constructor(
    private readonly myBilling: ListMyBillingUseCase,
    private readonly initializePaystack: InitializePaystackPaymentUseCase,
    private readonly submitManual: SubmitManualPaymentUseCase,
  ) {}

  @Get('invoices')
  invoices(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
  ) {
    return this.myBilling.invoices(tenant.organizationId, auth.userId);
  }

  @Get('payments')
  payments(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
  ) {
    return this.myBilling.payments(tenant.organizationId, auth.userId);
  }

  @Get('payments/:id')
  payment(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.myBilling.payment(tenant.organizationId, auth.userId, id);
  }

  @Post('payments/paystack/initialize')
  @ApiOperation({ summary: 'Initialize Paystack payment for one or more invoices' })
  paystack(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Body() body: InitializePaystackDto,
  ) {
    return this.initializePaystack.execute({
      organizationId: tenant.organizationId,
      userId: auth.userId,
      invoiceIds: body.invoiceIds,
      idempotencyKey: body.idempotencyKey,
      callbackUrl: body.callbackUrl,
    });
  }

  @Post('payments/manual')
  @ApiOperation({
    summary: 'Submit manual bank-transfer payment (optional fileId until Files M4)',
  })
  manual(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
    @Body() body: ManualPaymentDto,
  ) {
    return this.submitManual.execute({
      organizationId: tenant.organizationId,
      userId: auth.userId,
      ...body,
    });
  }

  @Get('receipts')
  receipts(
    @CurrentTenant() tenant: TenantContext,
    @CurrentAuthUser() auth: AuthenticatedRequestUser,
  ) {
    return this.myBilling.receipts(tenant.organizationId, auth.userId);
  }
}
