import { createHash, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import {
  ageInYears,
  assertCanActivateSchedule,
  assertCanGenerateInvoices,
  assertCurrency,
  assertInvoicePayable,
  assertPaymentAwaitingVerification,
  assertPaymentPending,
  nextInvoiceBalance,
  normalizeFeeCode,
  parseKobo,
  selectFeeRule,
  type FeePeriodType,
  type InvoiceStatus,
  type PaymentStatus,
} from '../domain/billing.rules';
import {
  BILLING_REPOSITORY,
  PAYMENT_GATEWAY,
  type BillingRepository,
  type PaymentGateway,
} from './ports/billing.repository';
import { GetReadyFileUseCase } from '../../files/application/file.use-cases';

@Injectable()
export class ListFeeSchedulesUseCase {
  constructor(@Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository) {}
  execute(organizationId: string) {
    return this.repo.listFeeSchedules(organizationId);
  }
}

@Injectable()
export class GetFeeScheduleUseCase {
  constructor(@Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository) {}
  async execute(organizationId: string, id: string) {
    const row = await this.repo.findFeeSchedule(organizationId, id, true);
    if (!row) throw new DomainError('FEE_SCHEDULE_NOT_FOUND', 'Fee schedule not found');
    return row;
  }
}

@Injectable()
export class CreateFeeScheduleUseCase {
  constructor(@Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository) {}
  execute(input: {
    organizationId: string;
    code: string;
    name: string;
    periodType: FeePeriodType;
    periodYear?: number | null;
    currency: string;
    startsOn?: string | null;
    endsOn?: string | null;
  }) {
    if (!input.name.trim()) throw new DomainError('INVALID_TITLE', 'Name is required');
    return this.repo.createFeeSchedule({
      organizationId: input.organizationId,
      code: normalizeFeeCode(input.code),
      name: input.name.trim(),
      periodType: input.periodType,
      periodYear: input.periodYear ?? null,
      currency: assertCurrency(input.currency),
      startsOn: input.startsOn ? new Date(input.startsOn) : null,
      endsOn: input.endsOn ? new Date(input.endsOn) : null,
    });
  }
}

@Injectable()
export class UpdateFeeScheduleUseCase {
  constructor(@Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository) {}
  async execute(input: {
    organizationId: string;
    id: string;
    name?: string;
    periodYear?: number | null;
    startsOn?: string | null;
    endsOn?: string | null;
  }) {
    const existing = await this.repo.findFeeSchedule(input.organizationId, input.id);
    if (!existing) throw new DomainError('FEE_SCHEDULE_NOT_FOUND', 'Fee schedule not found');
    return this.repo.updateFeeSchedule({
      organizationId: input.organizationId,
      id: input.id,
      name: input.name?.trim(),
      periodYear: input.periodYear,
      startsOn:
        input.startsOn !== undefined
          ? input.startsOn
            ? new Date(input.startsOn)
            : null
          : undefined,
      endsOn:
        input.endsOn !== undefined ? (input.endsOn ? new Date(input.endsOn) : null) : undefined,
    });
  }
}

@Injectable()
export class ActivateFeeScheduleUseCase {
  constructor(@Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository) {}
  async execute(organizationId: string, id: string) {
    const existing = await this.repo.findFeeSchedule(organizationId, id, true);
    if (!existing) throw new DomainError('FEE_SCHEDULE_NOT_FOUND', 'Fee schedule not found');
    assertCanActivateSchedule(existing.status);
    if (existing.rules.length === 0) {
      throw new DomainError('FEE_RULES_REQUIRED', 'Add at least one fee rule before activating');
    }
    return this.repo.updateFeeSchedule({ organizationId, id, status: 'active' });
  }
}

@Injectable()
export class CreateFeeRuleUseCase {
  constructor(@Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository) {}
  async execute(input: {
    organizationId: string;
    feeScheduleId: string;
    membershipTypeId?: string | null;
    institutionOwnership?: 'public' | 'private' | null;
    minAge?: number | null;
    maxAge?: number | null;
    isOptionalExempt?: boolean;
    amountKobo: string;
    priority?: number;
  }) {
    const schedule = await this.repo.findFeeSchedule(input.organizationId, input.feeScheduleId);
    if (!schedule) throw new DomainError('FEE_SCHEDULE_NOT_FOUND', 'Fee schedule not found');
    if (schedule.status === 'closed') {
      throw new DomainError('FEE_SCHEDULE_CLOSED', 'Cannot add rules to a closed schedule');
    }
    return this.repo.createFeeRule({
      organizationId: input.organizationId,
      feeScheduleId: input.feeScheduleId,
      membershipTypeId: input.membershipTypeId ?? null,
      institutionOwnership: input.institutionOwnership ?? null,
      minAge: input.minAge ?? null,
      maxAge: input.maxAge ?? null,
      isOptionalExempt: input.isOptionalExempt ?? false,
      amountKobo: parseKobo(input.amountKobo),
      priority: input.priority,
    });
  }
}

@Injectable()
export class UpdateFeeRuleUseCase {
  constructor(@Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository) {}
  async execute(input: {
    organizationId: string;
    feeScheduleId: string;
    ruleId: string;
    membershipTypeId?: string | null;
    institutionOwnership?: 'public' | 'private' | null;
    minAge?: number | null;
    maxAge?: number | null;
    isOptionalExempt?: boolean;
    amountKobo?: string;
    priority?: number;
  }) {
    return this.repo.updateFeeRule({
      ...input,
      amountKobo: input.amountKobo !== undefined ? parseKobo(input.amountKobo) : undefined,
    });
  }
}

@Injectable()
export class DeleteFeeRuleUseCase {
  constructor(@Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository) {}
  async execute(organizationId: string, feeScheduleId: string, ruleId: string) {
    await this.repo.deleteFeeRule(organizationId, feeScheduleId, ruleId);
    return { ok: true as const };
  }
}

@Injectable()
export class GenerateInvoicesUseCase {
  constructor(@Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository) {}
  async execute(organizationId: string, feeScheduleId: string) {
    const schedule = await this.repo.findFeeSchedule(organizationId, feeScheduleId, true);
    if (!schedule) throw new DomainError('FEE_SCHEDULE_NOT_FOUND', 'Fee schedule not found');
    assertCanGenerateInvoices(schedule.status);

    const members = await this.repo.listActiveMembersForBilling(organizationId);
    const ruleCandidates = schedule.rules.map((r) => ({
      id: r.id,
      membershipTypeId: r.membershipTypeId,
      institutionOwnership: r.institutionOwnership,
      minAge: r.minAge,
      maxAge: r.maxAge,
      isOptionalExempt: r.isOptionalExempt,
      amountKobo: BigInt(r.amountKobo),
      priority: r.priority,
    }));

    let created = 0;
    let skipped = 0;
    const year = schedule.periodYear ?? new Date().getUTCFullYear();

    for (const member of members) {
      const existing = await this.repo.findOpenInvoiceForMemberSchedule(
        organizationId,
        member.id,
        feeScheduleId,
      );
      if (existing) {
        skipped += 1;
        continue;
      }

      const rule = selectFeeRule(ruleCandidates, {
        membershipTypeId: member.membershipTypeId,
        institutionOwnership: member.primaryInstitutionOwnership,
        age: ageInYears(member.dateOfBirth),
        duesExempt: member.duesExempt,
      });
      if (!rule) {
        skipped += 1;
        continue;
      }

      const seq = await this.repo.nextInvoiceSequence(organizationId, `INV-${year}-`);
      const invoiceNo = `INV-${year}-${String(seq).padStart(6, '0')}`;
      await this.repo.createInvoice({
        organizationId,
        memberId: member.id,
        feeScheduleId,
        invoiceNo,
        currency: schedule.currency,
        amountDueKobo: rule.amountKobo,
        status: 'open',
        dueOn: schedule.endsOn ? new Date(schedule.endsOn) : null,
        issuedAt: new Date(),
      });
      created += 1;
    }

    return { created, skipped, totalMembers: members.length };
  }
}

@Injectable()
export class ListInvoicesUseCase {
  constructor(@Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository) {}
  execute(input: {
    organizationId: string;
    memberId?: string;
    status?: InvoiceStatus;
    page?: number;
    limit?: number;
  }) {
    return this.repo.listInvoices(input);
  }
}

@Injectable()
export class GetInvoiceUseCase {
  constructor(@Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository) {}
  async execute(organizationId: string, id: string) {
    const row = await this.repo.findInvoice(organizationId, id);
    if (!row) throw new DomainError('INVOICE_NOT_FOUND', 'Invoice not found');
    return row;
  }
}

@Injectable()
export class WaiveInvoiceUseCase {
  constructor(@Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository) {}
  async execute(organizationId: string, id: string, reason: string) {
    if (!reason.trim()) {
      throw new DomainError('WAIVE_REASON_REQUIRED', 'Waive reason is required');
    }
    const invoice = await this.repo.findInvoice(organizationId, id);
    if (!invoice) throw new DomainError('INVOICE_NOT_FOUND', 'Invoice not found');
    if (invoice.status !== 'open' && invoice.status !== 'draft') {
      throw new DomainError('INVOICE_NOT_WAIVABLE', 'Invoice cannot be waived');
    }
    return this.repo.updateInvoice({
      organizationId,
      id,
      status: 'waived',
      waivedReason: reason.trim(),
    });
  }
}

@Injectable()
export class VoidInvoiceUseCase {
  constructor(@Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository) {}
  async execute(organizationId: string, id: string) {
    const invoice = await this.repo.findInvoice(organizationId, id);
    if (!invoice) throw new DomainError('INVOICE_NOT_FOUND', 'Invoice not found');
    if (invoice.status === 'paid' || BigInt(invoice.amountPaidKobo) > 0n) {
      throw new DomainError('INVOICE_NOT_VOIDABLE', 'Paid invoices cannot be voided');
    }
    return this.repo.updateInvoice({ organizationId, id, status: 'void' });
  }
}

@Injectable()
export class ListPaymentsUseCase {
  constructor(@Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository) {}
  execute(input: {
    organizationId: string;
    memberId?: string;
    institutionId?: string;
    status?: PaymentStatus;
    page?: number;
    limit?: number;
  }) {
    return this.repo.listPayments(input);
  }
}

@Injectable()
export class GetPaymentUseCase {
  constructor(@Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository) {}
  async execute(organizationId: string, id: string) {
    const row = await this.repo.findPayment(organizationId, id);
    if (!row) throw new DomainError('PAYMENT_NOT_FOUND', 'Payment not found');
    return row;
  }
}

@Injectable()
export class InitializePaystackPaymentUseCase {
  constructor(
    @Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  async execute(input: {
    organizationId: string;
    userId: string;
    invoiceIds: string[];
    idempotencyKey: string;
    callbackUrl?: string;
  }) {
    if (!input.invoiceIds.length) {
      throw new DomainError('INVOICES_REQUIRED', 'At least one invoiceId is required');
    }
    const requestHash = hashPayload({
      invoiceIds: [...input.invoiceIds].sort(),
      userId: input.userId,
    });
    const cached = await this.repo.getIdempotency(input.organizationId, input.idempotencyKey);
    if (cached) {
      if (cached.requestHash !== requestHash) {
        throw new DomainError('IDEMPOTENCY_CONFLICT', 'Idempotency key reused with different body');
      }
      return cached.responseBody as {
        payment: unknown;
        authorizationUrl: string;
      };
    }

    const member = await this.repo.findMemberByUserId(input.organizationId, input.userId);
    if (!member) throw new DomainError('MEMBER_PROFILE_NOT_FOUND', 'No member profile linked');

    const invoices = [];
    for (const id of input.invoiceIds) {
      const invoice = await this.repo.findInvoice(input.organizationId, id);
      if (!invoice) throw new DomainError('INVOICE_NOT_FOUND', `Invoice ${id} not found`);
      if (invoice.memberId !== member.id) {
        throw new DomainError('FORBIDDEN', 'Invoice does not belong to this member');
      }
      assertInvoicePayable(invoice.status);
      invoices.push(invoice);
    }

    const currency = invoices[0]!.currency;
    if (invoices.some((i) => i.currency !== currency)) {
      throw new DomainError('CURRENCY_MISMATCH', 'Invoices must share the same currency');
    }

    let total = 0n;
    const allocations: { invoiceId: string; amountKobo: bigint }[] = [];
    for (const invoice of invoices) {
      const balance = BigInt(invoice.amountDueKobo) - BigInt(invoice.amountPaidKobo);
      if (balance <= 0n) {
        throw new DomainError('INVOICE_ALREADY_PAID', 'Invoice has no balance due');
      }
      total += balance;
      allocations.push({ invoiceId: invoice.id, amountKobo: balance });
    }

    const email =
      member.alternateEmail ??
      (member.userId ? await this.repo.findUserEmail(input.organizationId, member.userId) : null);
    if (!email) {
      throw new DomainError('PAYER_EMAIL_REQUIRED', 'Member needs an email for Paystack');
    }

    const reference = `psk_${randomUUID().replace(/-/g, '')}`;
    const payment = await this.repo.createPayment({
      organizationId: input.organizationId,
      payerType: 'member',
      memberId: member.id,
      channel: 'paystack',
      currency,
      amountKobo: total,
      status: 'pending',
      reference,
      initiatedByUserId: input.userId,
    });
    await this.repo.createAllocations(input.organizationId, payment.id, allocations);

    const init = await this.gateway.initialize({
      amountKobo: total,
      currency,
      email,
      reference,
      callbackUrl: input.callbackUrl ?? '',
      metadata: {
        organizationId: input.organizationId,
        paymentId: payment.id,
        memberId: member.id,
      },
    });

    await this.repo.createPaystackTransaction({
      organizationId: input.organizationId,
      paymentId: payment.id,
      paystackReference: init.reference,
      accessCode: init.accessCode,
      authorizationUrl: init.authorizationUrl,
      rawInitialize: init.raw,
    });

    const response = {
      payment: { ...payment, authorizationUrl: init.authorizationUrl },
      authorizationUrl: init.authorizationUrl,
    };
    await this.repo.saveIdempotency({
      organizationId: input.organizationId,
      key: input.idempotencyKey,
      requestHash,
      responseCode: 201,
      responseBody: response,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    return response;
  }
}

@Injectable()
export class SubmitManualPaymentUseCase {
  constructor(
    @Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository,
    private readonly getReadyFile: GetReadyFileUseCase,
  ) {}

  async execute(input: {
    organizationId: string;
    userId: string;
    invoiceIds: string[];
    amountKobo: string;
    narration?: string | null;
    fileId?: string | null;
    bankName?: string | null;
    transferReference?: string | null;
    transferredAt?: string | null;
    note?: string | null;
  }) {
    if (!input.invoiceIds.length) {
      throw new DomainError('INVOICES_REQUIRED', 'At least one invoiceId is required');
    }
    const member = await this.repo.findMemberByUserId(input.organizationId, input.userId);
    if (!member) throw new DomainError('MEMBER_PROFILE_NOT_FOUND', 'No member profile linked');

    const amount = parseKobo(input.amountKobo);
    if (amount <= 0n) throw new DomainError('INVALID_MONEY', 'Amount must be greater than zero');

    if (input.fileId) {
      await this.getReadyFile.execute(input.organizationId, input.fileId, {
        purposes: ['payment_evidence'],
      });
    }

    const invoices = [];
    for (const id of input.invoiceIds) {
      const invoice = await this.repo.findInvoice(input.organizationId, id);
      if (!invoice) throw new DomainError('INVOICE_NOT_FOUND', `Invoice ${id} not found`);
      if (invoice.memberId !== member.id) {
        throw new DomainError('FORBIDDEN', 'Invoice does not belong to this member');
      }
      assertInvoicePayable(invoice.status);
      invoices.push(invoice);
    }

    const currency = invoices[0]!.currency;
    const allocations = allocateAcrossInvoices(invoices, amount);

    const reference = `man_${randomUUID().replace(/-/g, '')}`;
    const payment = await this.repo.createPayment({
      organizationId: input.organizationId,
      payerType: 'member',
      memberId: member.id,
      channel: 'manual',
      currency,
      amountKobo: amount,
      status: 'awaiting_verification',
      reference,
      narration: input.narration ?? null,
      initiatedByUserId: input.userId,
    });
    await this.repo.createAllocations(input.organizationId, payment.id, allocations);

    if (input.fileId) {
      await this.repo.createPaymentEvidence({
        organizationId: input.organizationId,
        paymentId: payment.id,
        fileId: input.fileId,
        bankName: input.bankName ?? null,
        transferReference: input.transferReference ?? null,
        transferredAt: input.transferredAt ? new Date(input.transferredAt) : null,
        note: input.note ?? null,
      });
    }

    return payment;
  }
}

@Injectable()
export class VerifyPaymentUseCase {
  constructor(@Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository) {}

  async execute(organizationId: string, paymentId: string, actorUserId: string) {
    const payment = await this.repo.findPayment(organizationId, paymentId);
    if (!payment) throw new DomainError('PAYMENT_NOT_FOUND', 'Payment not found');
    assertPaymentAwaitingVerification(payment.status);
    return settleSucceededPayment(this.repo, {
      organizationId,
      paymentId,
      actorUserId,
    });
  }
}

@Injectable()
export class RejectPaymentUseCase {
  constructor(@Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository) {}

  async execute(organizationId: string, paymentId: string, actorUserId: string, reason: string) {
    if (!reason.trim()) {
      throw new DomainError('REJECTION_REASON_REQUIRED', 'Rejection reason is required');
    }
    const payment = await this.repo.findPayment(organizationId, paymentId);
    if (!payment) throw new DomainError('PAYMENT_NOT_FOUND', 'Payment not found');
    assertPaymentAwaitingVerification(payment.status);
    return this.repo.updatePayment({
      organizationId,
      id: paymentId,
      status: 'rejected',
      verifiedByUserId: actorUserId,
      verifiedAt: new Date(),
      rejectionReason: reason.trim(),
    });
  }
}

@Injectable()
export class HandlePaystackWebhookUseCase {
  constructor(
    @Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  async execute(input: { rawBody: string; signature: string | undefined; event: unknown }) {
    if (!this.gateway.verifyWebhookSignature(input.rawBody, input.signature)) {
      throw new DomainError('INVALID_WEBHOOK_SIGNATURE', 'Invalid Paystack signature');
    }

    const event = input.event as {
      event?: string;
      data?: { reference?: string; status?: string; amount?: number; currency?: string };
    };

    if (event.event !== 'charge.success') {
      return { ok: true as const, ignored: true as const };
    }

    const reference = event.data?.reference;
    if (!reference) {
      throw new DomainError('INVALID_WEBHOOK_PAYLOAD', 'Missing transaction reference');
    }

    const found = await this.repo.findPaymentByPaystackReference(reference);
    if (!found) {
      // Acknowledge unknown refs to avoid infinite retries while logging at filter layer
      return { ok: true as const, ignored: true as const };
    }

    if (found.payment.status === 'succeeded') {
      return { ok: true as const, alreadyProcessed: true as const };
    }

    assertPaymentPending(found.payment.status);

    const verified = await this.gateway.verifyTransaction(reference);
    await this.repo.updatePaystackWebhook({
      paystackReference: reference,
      rawWebhook: event,
      verifiedPayload: verified.raw,
    });

    if (verified.status !== 'success') {
      await this.repo.updatePayment({
        organizationId: found.organizationId,
        id: found.payment.id,
        status: 'failed',
      });
      return { ok: true as const, failed: true as const };
    }

    if (verified.amountKobo !== 0n && verified.amountKobo !== BigInt(found.payment.amountKobo)) {
      throw new DomainError('AMOUNT_MISMATCH', 'Paystack amount does not match payment');
    }

    await settleSucceededPayment(this.repo, {
      organizationId: found.organizationId,
      paymentId: found.payment.id,
    });

    return { ok: true as const };
  }
}

@Injectable()
export class ListMyBillingUseCase {
  constructor(@Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository) {}

  async invoices(organizationId: string, userId: string) {
    const member = await this.repo.findMemberByUserId(organizationId, userId);
    if (!member) throw new DomainError('MEMBER_PROFILE_NOT_FOUND', 'No member profile linked');
    return this.repo.listInvoices({ organizationId, memberId: member.id, limit: 100 });
  }

  async payments(organizationId: string, userId: string) {
    const member = await this.repo.findMemberByUserId(organizationId, userId);
    if (!member) throw new DomainError('MEMBER_PROFILE_NOT_FOUND', 'No member profile linked');
    return this.repo.listPayments({ organizationId, memberId: member.id, limit: 100 });
  }

  async payment(organizationId: string, userId: string, paymentId: string) {
    const member = await this.repo.findMemberByUserId(organizationId, userId);
    if (!member) throw new DomainError('MEMBER_PROFILE_NOT_FOUND', 'No member profile linked');
    const payment = await this.repo.findPayment(organizationId, paymentId);
    if (!payment || payment.memberId !== member.id) {
      throw new DomainError('PAYMENT_NOT_FOUND', 'Payment not found');
    }
    return payment;
  }

  async receipts(organizationId: string, userId: string) {
    const member = await this.repo.findMemberByUserId(organizationId, userId);
    if (!member) throw new DomainError('MEMBER_PROFILE_NOT_FOUND', 'No member profile linked');
    return this.repo.listReceipts(organizationId, member.id);
  }
}

async function settleSucceededPayment(
  repo: BillingRepository,
  input: { organizationId: string; paymentId: string; actorUserId?: string },
) {
  const allocations = await repo.listAllocations(input.organizationId, input.paymentId);
  const now = new Date();

  for (const line of allocations) {
    const invoice = await repo.findInvoice(input.organizationId, line.invoiceId);
    if (!invoice) throw new DomainError('INVOICE_NOT_FOUND', 'Allocated invoice missing');
    const next = nextInvoiceBalance(
      BigInt(invoice.amountDueKobo),
      BigInt(invoice.amountPaidKobo),
      line.amountKobo,
    );
    await repo.updateInvoice({
      organizationId: input.organizationId,
      id: invoice.id,
      amountPaidKobo: next.amountPaidKobo,
      status: next.status,
      paidAt: next.status === 'paid' ? now : invoice.paidAt ? new Date(invoice.paidAt) : null,
    });
  }

  const payment = await repo.updatePayment({
    organizationId: input.organizationId,
    id: input.paymentId,
    status: 'succeeded',
    paidAt: now,
    verifiedByUserId: input.actorUserId ?? null,
    verifiedAt: input.actorUserId ? now : now,
  });

  const year = now.getUTCFullYear();
  const seq = await repo.nextInvoiceSequence(input.organizationId, `RCP-${year}-`);
  await repo.createReceipt({
    organizationId: input.organizationId,
    paymentId: payment.id,
    receiptNo: `RCP-${year}-${String(seq).padStart(6, '0')}`,
    issuedAt: now,
    issuedByUserId: input.actorUserId ?? null,
  });

  const remittance = await repo.findBulkRemittanceByPaymentId(input.organizationId, payment.id);
  if (remittance && remittance.status === 'submitted') {
    await repo.updateBulkRemittance({
      organizationId: input.organizationId,
      id: remittance.id,
      status: 'allocated',
    });
  }

  return payment;
}

function allocateAcrossInvoices(
  invoices: { id: string; amountDueKobo: string; amountPaidKobo: string }[],
  amount: bigint,
): { invoiceId: string; amountKobo: bigint }[] {
  let remaining = amount;
  const lines: { invoiceId: string; amountKobo: bigint }[] = [];
  for (const invoice of invoices) {
    if (remaining <= 0n) break;
    const balance = BigInt(invoice.amountDueKobo) - BigInt(invoice.amountPaidKobo);
    if (balance <= 0n) continue;
    const take = remaining < balance ? remaining : balance;
    lines.push({ invoiceId: invoice.id, amountKobo: take });
    remaining -= take;
  }
  if (remaining > 0n) {
    throw new DomainError('OVER_ALLOCATION', 'Payment amount exceeds open invoice balances');
  }
  if (lines.length === 0) {
    throw new DomainError('INVOICE_ALREADY_PAID', 'No open invoice balance to allocate');
  }
  return lines;
}

function hashPayload(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
