import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { RbacModule } from '../rbac/rbac.module';
import { InstitutionsModule } from '../institutions/institutions.module';
import { FilesModule } from '../files/files.module';
import { BILLING_REPOSITORY, PAYMENT_GATEWAY } from './application/ports/billing.repository';
import {
  ActivateFeeScheduleUseCase,
  CreateFeeRuleUseCase,
  CreateFeeScheduleUseCase,
  DeleteFeeRuleUseCase,
  GenerateInvoicesUseCase,
  GetFeeScheduleUseCase,
  GetInvoiceUseCase,
  GetPaymentUseCase,
  HandlePaystackWebhookUseCase,
  InitializePaystackPaymentUseCase,
  ListFeeSchedulesUseCase,
  ListInvoicesUseCase,
  ListMyBillingUseCase,
  ListPaymentsUseCase,
  RejectPaymentUseCase,
  SubmitManualPaymentUseCase,
  UpdateFeeRuleUseCase,
  UpdateFeeScheduleUseCase,
  VerifyPaymentUseCase,
  VoidInvoiceUseCase,
  WaiveInvoiceUseCase,
} from './application/billing.use-cases';
import {
  CreateBulkRemittanceUseCase,
  GetBulkRemittanceUseCase,
  InitializeBulkRemittancePaystackUseCase,
  ListBulkRemittancesUseCase,
  ResolveBulkRemittanceLineUseCase,
  SubmitBulkRemittanceEvidenceUseCase,
  SubmitBulkRemittanceUseCase,
} from './application/remittance.use-cases';
import { PrismaBillingRepository } from './infrastructure/prisma-billing.repository';
import { PaystackPaymentGateway } from './infrastructure/paystack-payment.gateway';
import { AdminBillingController } from './presentation/admin-billing.controller';
import { MeBillingController } from './presentation/me-billing.controller';
import { PaystackWebhookController } from './presentation/paystack-webhook.controller';
import { InstitutionBillingController } from './presentation/institution-billing.controller';

@Module({
  imports: [IdentityModule, TenancyModule, RbacModule, InstitutionsModule, FilesModule],
  controllers: [
    AdminBillingController,
    MeBillingController,
    PaystackWebhookController,
    InstitutionBillingController,
  ],
  providers: [
    { provide: BILLING_REPOSITORY, useClass: PrismaBillingRepository },
    { provide: PAYMENT_GATEWAY, useClass: PaystackPaymentGateway },
    ListFeeSchedulesUseCase,
    GetFeeScheduleUseCase,
    CreateFeeScheduleUseCase,
    UpdateFeeScheduleUseCase,
    ActivateFeeScheduleUseCase,
    CreateFeeRuleUseCase,
    UpdateFeeRuleUseCase,
    DeleteFeeRuleUseCase,
    GenerateInvoicesUseCase,
    ListInvoicesUseCase,
    GetInvoiceUseCase,
    WaiveInvoiceUseCase,
    VoidInvoiceUseCase,
    ListPaymentsUseCase,
    GetPaymentUseCase,
    InitializePaystackPaymentUseCase,
    SubmitManualPaymentUseCase,
    VerifyPaymentUseCase,
    RejectPaymentUseCase,
    HandlePaystackWebhookUseCase,
    ListMyBillingUseCase,
    CreateBulkRemittanceUseCase,
    ListBulkRemittancesUseCase,
    GetBulkRemittanceUseCase,
    SubmitBulkRemittanceUseCase,
    InitializeBulkRemittancePaystackUseCase,
    SubmitBulkRemittanceEvidenceUseCase,
    ResolveBulkRemittanceLineUseCase,
  ],
})
export class BillingModule {}
