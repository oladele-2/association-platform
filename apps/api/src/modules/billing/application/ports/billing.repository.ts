import type {
  FeePeriodType,
  FeeScheduleStatus,
  InvoiceStatus,
  PaymentStatus,
  BulkRemittanceStatus,
  MatchStatus,
} from '../../domain/billing.rules';

export type FeeRuleView = {
  id: string;
  feeScheduleId: string;
  membershipTypeId: string | null;
  institutionOwnership: 'public' | 'private' | null;
  minAge: number | null;
  maxAge: number | null;
  isOptionalExempt: boolean;
  amountKobo: string;
  priority: number;
};

export type FeeScheduleView = {
  id: string;
  code: string;
  name: string;
  periodType: FeePeriodType;
  periodYear: number | null;
  currency: string;
  status: FeeScheduleStatus;
  startsOn: string | null;
  endsOn: string | null;
  createdAt: string;
  updatedAt: string;
  rules?: FeeRuleView[];
};

export type InvoiceView = {
  id: string;
  memberId: string;
  feeScheduleId: string;
  invoiceNo: string;
  currency: string;
  amountDueKobo: string;
  amountPaidKobo: string;
  status: InvoiceStatus;
  dueOn: string | null;
  waivedReason: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type PaymentView = {
  id: string;
  payerType: 'member' | 'institution';
  memberId: string | null;
  institutionId: string | null;
  channel: 'paystack' | 'manual' | 'bulk_institution';
  currency: string;
  amountKobo: string;
  status: PaymentStatus;
  reference: string;
  narration: string | null;
  paidAt: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  authorizationUrl?: string | null;
};

export type ReceiptView = {
  id: string;
  paymentId: string;
  receiptNo: string;
  issuedAt: string;
  fileId: string | null;
};

export type MemberForBilling = {
  id: string;
  userId: string | null;
  membershipTypeId: string;
  dateOfBirth: Date | null;
  duesExempt: boolean;
  status: string;
  alternateEmail: string | null;
  primaryInstitutionOwnership: 'public' | 'private' | null;
};

export interface BillingRepository {
  listFeeSchedules(organizationId: string): Promise<FeeScheduleView[]>;
  findFeeSchedule(
    organizationId: string,
    id: string,
    withRules?: boolean,
  ): Promise<(FeeScheduleView & { rules: FeeRuleView[] }) | null>;
  createFeeSchedule(input: {
    organizationId: string;
    code: string;
    name: string;
    periodType: FeePeriodType;
    periodYear?: number | null;
    currency: string;
    startsOn?: Date | null;
    endsOn?: Date | null;
  }): Promise<FeeScheduleView>;
  updateFeeSchedule(input: {
    organizationId: string;
    id: string;
    name?: string;
    periodYear?: number | null;
    startsOn?: Date | null;
    endsOn?: Date | null;
    status?: FeeScheduleStatus;
  }): Promise<FeeScheduleView>;
  createFeeRule(input: {
    organizationId: string;
    feeScheduleId: string;
    membershipTypeId?: string | null;
    institutionOwnership?: 'public' | 'private' | null;
    minAge?: number | null;
    maxAge?: number | null;
    isOptionalExempt?: boolean;
    amountKobo: bigint;
    priority?: number;
  }): Promise<FeeRuleView>;
  updateFeeRule(input: {
    organizationId: string;
    feeScheduleId: string;
    ruleId: string;
    membershipTypeId?: string | null;
    institutionOwnership?: 'public' | 'private' | null;
    minAge?: number | null;
    maxAge?: number | null;
    isOptionalExempt?: boolean;
    amountKobo?: bigint;
    priority?: number;
  }): Promise<FeeRuleView>;
  deleteFeeRule(organizationId: string, feeScheduleId: string, ruleId: string): Promise<void>;

  listActiveMembersForBilling(organizationId: string): Promise<MemberForBilling[]>;
  findMemberForBilling(organizationId: string, memberId: string): Promise<MemberForBilling | null>;
  findMemberByUserId(organizationId: string, userId: string): Promise<MemberForBilling | null>;
  findUserEmail(organizationId: string, userId: string): Promise<string | null>;

  findOpenInvoiceForMemberSchedule(
    organizationId: string,
    memberId: string,
    feeScheduleId: string,
  ): Promise<InvoiceView | null>;
  createInvoice(input: {
    organizationId: string;
    memberId: string;
    feeScheduleId: string;
    invoiceNo: string;
    currency: string;
    amountDueKobo: bigint;
    status: InvoiceStatus;
    dueOn?: Date | null;
    issuedAt?: Date | null;
  }): Promise<InvoiceView>;
  listInvoices(input: {
    organizationId: string;
    memberId?: string;
    status?: InvoiceStatus;
    page?: number;
    limit?: number;
  }): Promise<{ items: InvoiceView[]; page: number; limit: number; total: number }>;
  findInvoice(organizationId: string, id: string): Promise<InvoiceView | null>;
  updateInvoice(input: {
    organizationId: string;
    id: string;
    status?: InvoiceStatus;
    amountPaidKobo?: bigint;
    waivedReason?: string | null;
    paidAt?: Date | null;
  }): Promise<InvoiceView>;

  nextInvoiceSequence(organizationId: string, prefix: string): Promise<number>;

  createPayment(input: {
    organizationId: string;
    payerType: 'member' | 'institution';
    memberId?: string | null;
    institutionId?: string | null;
    channel: 'paystack' | 'manual' | 'bulk_institution';
    currency: string;
    amountKobo: bigint;
    status: PaymentStatus;
    reference: string;
    narration?: string | null;
    initiatedByUserId?: string | null;
  }): Promise<PaymentView>;
  createAllocations(
    organizationId: string,
    paymentId: string,
    lines: { invoiceId: string; amountKobo: bigint }[],
  ): Promise<void>;
  createPaystackTransaction(input: {
    organizationId: string;
    paymentId: string;
    paystackReference: string;
    accessCode?: string | null;
    authorizationUrl?: string | null;
    rawInitialize?: unknown;
  }): Promise<void>;
  createPaymentEvidence(input: {
    organizationId: string;
    paymentId: string;
    fileId: string;
    bankName?: string | null;
    transferReference?: string | null;
    transferredAt?: Date | null;
    note?: string | null;
  }): Promise<void>;
  findPayment(organizationId: string, id: string): Promise<PaymentView | null>;
  findPaymentByReference(organizationId: string, reference: string): Promise<PaymentView | null>;
  findPaymentByPaystackReference(paystackReference: string): Promise<{
    organizationId: string;
    payment: PaymentView;
  } | null>;
  listPayments(input: {
    organizationId: string;
    memberId?: string;
    institutionId?: string;
    status?: PaymentStatus;
    page?: number;
    limit?: number;
  }): Promise<{ items: PaymentView[]; page: number; limit: number; total: number }>;
  listAllocations(
    organizationId: string,
    paymentId: string,
  ): Promise<{ invoiceId: string; amountKobo: bigint }[]>;
  updatePayment(input: {
    organizationId: string;
    id: string;
    status?: PaymentStatus;
    paidAt?: Date | null;
    verifiedByUserId?: string | null;
    verifiedAt?: Date | null;
    rejectionReason?: string | null;
  }): Promise<PaymentView>;
  /**
   * Atomically CAS payment into `succeeded`, credit invoice allocations, issue receipt,
   * and mark linked remittance allocated. Idempotent when already succeeded.
   */
  settleSucceededPayment(input: {
    organizationId: string;
    paymentId: string;
    actorUserId?: string | null;
    fromStatuses: PaymentStatus[];
  }): Promise<{ payment: PaymentView; alreadySettled: boolean }>;
  updatePaystackWebhook(input: {
    paystackReference: string;
    rawWebhook?: unknown;
    verifiedPayload?: unknown;
  }): Promise<void>;
  createReceipt(input: {
    organizationId: string;
    paymentId: string;
    receiptNo: string;
    issuedAt: Date;
    issuedByUserId?: string | null;
  }): Promise<ReceiptView>;
  listReceipts(organizationId: string, memberId: string): Promise<ReceiptView[]>;
  findReceipt(organizationId: string, id: string): Promise<ReceiptView | null>;

  getIdempotency(
    organizationId: string,
    key: string,
  ): Promise<{
    requestHash: string;
    responseCode: number | null;
    responseBody: unknown;
  } | null>;
  saveIdempotency(input: {
    organizationId: string;
    key: string;
    requestHash: string;
    responseCode: number;
    responseBody: unknown;
    expiresAt: Date;
  }): Promise<void>;

  listBulkRemittances(input: {
    organizationId: string;
    institutionId?: string;
    status?: BulkRemittanceStatus;
  }): Promise<BulkRemittanceView[]>;
  findBulkRemittance(organizationId: string, id: string): Promise<BulkRemittanceView | null>;
  createBulkRemittance(input: {
    organizationId: string;
    institutionId: string;
    periodLabel?: string | null;
    createdByUserId?: string | null;
    lines: {
      memberId?: string | null;
      memberExternalRef?: string | null;
      amountKobo: bigint;
      matchStatus: MatchStatus;
      invoiceId?: string | null;
    }[];
  }): Promise<BulkRemittanceView>;
  updateBulkRemittance(input: {
    organizationId: string;
    id: string;
    status?: BulkRemittanceStatus;
    paymentId?: string | null;
  }): Promise<BulkRemittanceView>;
  updateBulkRemittanceLine(input: {
    organizationId: string;
    remittanceId: string;
    lineId: string;
    memberId?: string | null;
    invoiceId?: string | null;
    matchStatus?: MatchStatus;
    amountKobo?: bigint;
  }): Promise<BulkRemittanceLineView>;
  findOpenInvoicesForMember(organizationId: string, memberId: string): Promise<InvoiceView[]>;
  findBulkRemittanceByPaymentId(
    organizationId: string,
    paymentId: string,
  ): Promise<BulkRemittanceView | null>;
  membershipNoLookup(organizationId: string, membershipNo: string): Promise<string | null>;
}

export type BulkRemittanceLineView = {
  id: string;
  memberId: string | null;
  memberExternalRef: string | null;
  amountKobo: string;
  matchStatus: MatchStatus;
  invoiceId: string | null;
};

export type BulkRemittanceView = {
  id: string;
  institutionId: string;
  paymentId: string | null;
  status: BulkRemittanceStatus;
  periodLabel: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  lines: BulkRemittanceLineView[];
  totalAmountKobo: string;
};

export const BILLING_REPOSITORY = Symbol('BILLING_REPOSITORY');

export type InitializePaymentResult = {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
  raw: unknown;
};

export type VerifyTransactionResult = {
  status: 'success' | 'failed' | 'pending';
  amountKobo: bigint;
  currency: string;
  reference: string;
  raw: unknown;
};

export interface PaymentGateway {
  initialize(input: {
    amountKobo: bigint;
    currency: string;
    email: string;
    reference: string;
    callbackUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<InitializePaymentResult>;
  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean;
  verifyTransaction(reference: string): Promise<VerifyTransactionResult>;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
