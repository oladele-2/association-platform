import { createHash, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import {
  assertCanSubmitRemittance,
  assertRemittancePayable,
  parseKobo,
  type MatchStatus,
} from '../domain/billing.rules';
import {
  BILLING_REPOSITORY,
  PAYMENT_GATEWAY,
  type BillingRepository,
  type PaymentGateway,
} from './ports/billing.repository';
import { GetReadyFileUseCase } from '../../files/application/file.use-cases';

@Injectable()
export class CreateBulkRemittanceUseCase {
  constructor(@Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository) {}

  async execute(input: {
    organizationId: string;
    institutionId: string;
    periodLabel?: string | null;
    createdByUserId: string;
    lines: {
      memberId?: string | null;
      memberExternalRef?: string | null;
      amountKobo: string;
      invoiceId?: string | null;
    }[];
  }) {
    if (!input.lines.length) {
      throw new DomainError(
        'REMITTANCE_LINES_REQUIRED',
        'At least one remittance line is required',
      );
    }

    const resolved = [];
    for (const line of input.lines) {
      const amountKobo = parseKobo(line.amountKobo);
      if (amountKobo <= 0n) {
        throw new DomainError('INVALID_MONEY', 'Line amount must be greater than zero');
      }

      let memberId = line.memberId ?? null;
      if (!memberId && line.memberExternalRef?.trim()) {
        memberId = await this.repo.membershipNoLookup(
          input.organizationId,
          line.memberExternalRef.trim(),
        );
      }

      let invoiceId = line.invoiceId ?? null;
      let matchStatus: MatchStatus = 'unmatched';

      if (invoiceId) {
        const invoice = await this.repo.findInvoice(input.organizationId, invoiceId);
        if (!invoice) throw new DomainError('INVOICE_NOT_FOUND', 'Invoice not found');
        if (memberId && invoice.memberId !== memberId) {
          throw new DomainError('INVOICE_MEMBER_MISMATCH', 'Invoice does not belong to member');
        }
        memberId = memberId ?? invoice.memberId;
        matchStatus = 'matched';
      } else if (memberId) {
        const opens = await this.repo.findOpenInvoicesForMember(input.organizationId, memberId);
        const fit = opens.find(
          (inv) => BigInt(inv.amountDueKobo) - BigInt(inv.amountPaidKobo) === amountKobo,
        );
        if (fit) {
          invoiceId = fit.id;
          matchStatus = 'matched';
        } else if (opens[0]) {
          invoiceId = opens[0].id;
          matchStatus = 'matched';
        }
      }

      resolved.push({
        memberId,
        memberExternalRef: line.memberExternalRef ?? null,
        amountKobo,
        matchStatus,
        invoiceId,
      });
    }

    return this.repo.createBulkRemittance({
      organizationId: input.organizationId,
      institutionId: input.institutionId,
      periodLabel: input.periodLabel ?? null,
      createdByUserId: input.createdByUserId,
      lines: resolved,
    });
  }
}

@Injectable()
export class ListBulkRemittancesUseCase {
  constructor(@Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository) {}
  execute(input: {
    organizationId: string;
    institutionId?: string;
    status?: 'draft' | 'submitted' | 'allocated' | 'closed';
  }) {
    return this.repo.listBulkRemittances(input);
  }
}

@Injectable()
export class GetBulkRemittanceUseCase {
  constructor(@Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository) {}
  async execute(organizationId: string, id: string) {
    const row = await this.repo.findBulkRemittance(organizationId, id);
    if (!row) throw new DomainError('REMITTANCE_NOT_FOUND', 'Bulk remittance not found');
    return row;
  }
}

@Injectable()
export class SubmitBulkRemittanceUseCase {
  constructor(@Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository) {}
  async execute(organizationId: string, id: string) {
    const row = await this.repo.findBulkRemittance(organizationId, id);
    if (!row) throw new DomainError('REMITTANCE_NOT_FOUND', 'Bulk remittance not found');
    assertCanSubmitRemittance(row.status);
    if (row.lines.length === 0) {
      throw new DomainError('REMITTANCE_LINES_REQUIRED', 'Remittance has no lines');
    }
    return this.repo.updateBulkRemittance({
      organizationId,
      id,
      status: 'submitted',
    });
  }
}

@Injectable()
export class InitializeBulkRemittancePaystackUseCase {
  constructor(
    @Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  async execute(input: {
    organizationId: string;
    remittanceId: string;
    userId: string;
    email: string;
    idempotencyKey: string;
    callbackUrl?: string;
  }) {
    const requestHash = hashPayload({
      remittanceId: input.remittanceId,
      userId: input.userId,
    });
    const cached = await this.repo.getIdempotency(input.organizationId, input.idempotencyKey);
    if (cached) {
      if (cached.requestHash !== requestHash) {
        throw new DomainError('IDEMPOTENCY_CONFLICT', 'Idempotency key reused with different body');
      }
      return cached.responseBody;
    }

    const remittance = await this.repo.findBulkRemittance(input.organizationId, input.remittanceId);
    if (!remittance) throw new DomainError('REMITTANCE_NOT_FOUND', 'Bulk remittance not found');
    assertRemittancePayable(remittance.status);
    if (remittance.paymentId) {
      throw new DomainError('REMITTANCE_ALREADY_PAID', 'Remittance already has a payment');
    }

    const matched = remittance.lines.filter((l) => l.matchStatus === 'matched' && l.invoiceId);
    if (matched.length === 0) {
      throw new DomainError('NO_MATCHED_LINES', 'Resolve at least one matched line before paying');
    }

    const currency = await currencyFromInvoices(
      this.repo,
      input.organizationId,
      matched.map((l) => l.invoiceId!),
    );
    const amount = matched.reduce((sum, l) => sum + BigInt(l.amountKobo), 0n);
    const reference = `brk_${randomUUID().replace(/-/g, '')}`;

    const payment = await this.repo.createPayment({
      organizationId: input.organizationId,
      payerType: 'institution',
      institutionId: remittance.institutionId,
      channel: 'paystack',
      currency,
      amountKobo: amount,
      status: 'pending',
      reference,
      narration: remittance.periodLabel ?? `Bulk remittance ${remittance.id}`,
      initiatedByUserId: input.userId,
    });

    await this.repo.createAllocations(
      input.organizationId,
      payment.id,
      matched.map((l) => ({
        invoiceId: l.invoiceId!,
        amountKobo: BigInt(l.amountKobo),
      })),
    );
    await this.repo.updateBulkRemittance({
      organizationId: input.organizationId,
      id: remittance.id,
      paymentId: payment.id,
    });

    const init = await this.gateway.initialize({
      amountKobo: amount,
      currency,
      email: input.email,
      reference,
      callbackUrl: input.callbackUrl ?? '',
      metadata: {
        organizationId: input.organizationId,
        remittanceId: remittance.id,
        paymentId: payment.id,
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
      remittanceId: remittance.id,
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
export class SubmitBulkRemittanceEvidenceUseCase {
  constructor(
    @Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository,
    private readonly getReadyFile: GetReadyFileUseCase,
  ) {}

  async execute(input: {
    organizationId: string;
    remittanceId: string;
    userId: string;
    amountKobo?: string;
    narration?: string | null;
    fileId?: string | null;
    bankName?: string | null;
    transferReference?: string | null;
    transferredAt?: string | null;
    note?: string | null;
  }) {
    const remittance = await this.repo.findBulkRemittance(input.organizationId, input.remittanceId);
    if (!remittance) throw new DomainError('REMITTANCE_NOT_FOUND', 'Bulk remittance not found');
    assertRemittancePayable(remittance.status);
    if (remittance.paymentId) {
      throw new DomainError('REMITTANCE_ALREADY_PAID', 'Remittance already has a payment');
    }

    if (input.fileId) {
      await this.getReadyFile.execute(input.organizationId, input.fileId, {
        purposes: ['payment_evidence'],
      });
    }

    const matched = remittance.lines.filter((l) => l.matchStatus === 'matched' && l.invoiceId);
    if (matched.length === 0) {
      throw new DomainError('NO_MATCHED_LINES', 'Resolve at least one matched line before paying');
    }

    const currency = await currencyFromInvoices(
      this.repo,
      input.organizationId,
      matched.map((l) => l.invoiceId!),
    );
    const computed = matched.reduce((sum, l) => sum + BigInt(l.amountKobo), 0n);
    const amount = input.amountKobo !== undefined ? parseKobo(input.amountKobo) : computed;
    if (amount <= 0n) throw new DomainError('INVALID_MONEY', 'Amount must be greater than zero');
    if (amount !== computed) {
      throw new DomainError(
        'AMOUNT_MISMATCH',
        'Evidence amount must equal the sum of matched remittance lines',
      );
    }

    const reference = `brm_${randomUUID().replace(/-/g, '')}`;
    const payment = await this.repo.createPayment({
      organizationId: input.organizationId,
      payerType: 'institution',
      institutionId: remittance.institutionId,
      channel: 'bulk_institution',
      currency,
      amountKobo: amount,
      status: 'awaiting_verification',
      reference,
      narration: input.narration ?? remittance.periodLabel ?? null,
      initiatedByUserId: input.userId,
    });

    await this.repo.createAllocations(
      input.organizationId,
      payment.id,
      matched.map((l) => ({
        invoiceId: l.invoiceId!,
        amountKobo: BigInt(l.amountKobo),
      })),
    );
    await this.repo.updateBulkRemittance({
      organizationId: input.organizationId,
      id: remittance.id,
      paymentId: payment.id,
    });

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
export class ResolveBulkRemittanceLineUseCase {
  constructor(@Inject(BILLING_REPOSITORY) private readonly repo: BillingRepository) {}

  async execute(input: {
    organizationId: string;
    remittanceId: string;
    lineId: string;
    matchStatus: MatchStatus;
    memberId?: string | null;
    invoiceId?: string | null;
  }) {
    const remittance = await this.repo.findBulkRemittance(input.organizationId, input.remittanceId);
    if (!remittance) throw new DomainError('REMITTANCE_NOT_FOUND', 'Bulk remittance not found');
    const line = remittance.lines.find((l) => l.id === input.lineId);
    if (!line) throw new DomainError('REMITTANCE_LINE_NOT_FOUND', 'Remittance line not found');

    if (input.matchStatus === 'matched') {
      if (!input.invoiceId) {
        throw new DomainError('INVOICE_REQUIRED', 'invoiceId is required to match a line');
      }
      const invoice = await this.repo.findInvoice(input.organizationId, input.invoiceId);
      if (!invoice) throw new DomainError('INVOICE_NOT_FOUND', 'Invoice not found');
    }

    const updated = await this.repo.updateBulkRemittanceLine({
      organizationId: input.organizationId,
      remittanceId: input.remittanceId,
      lineId: input.lineId,
      matchStatus: input.matchStatus,
      memberId: input.memberId,
      invoiceId: input.matchStatus === 'excluded' ? null : input.invoiceId,
    });

    const refreshed = await this.repo.findBulkRemittance(input.organizationId, input.remittanceId);
    if (
      refreshed &&
      refreshed.lines.every((l) => l.matchStatus === 'matched' || l.matchStatus === 'excluded') &&
      refreshed.status === 'allocated'
    ) {
      await this.repo.updateBulkRemittance({
        organizationId: input.organizationId,
        id: remittance.id,
        status: 'closed',
      });
    }

    return updated;
  }
}

async function currencyFromInvoices(
  repo: BillingRepository,
  organizationId: string,
  invoiceIds: string[],
): Promise<string> {
  let currency: string | null = null;
  for (const id of invoiceIds) {
    const invoice = await repo.findInvoice(organizationId, id);
    if (!invoice) throw new DomainError('INVOICE_NOT_FOUND', 'Allocated invoice missing');
    if (!currency) currency = invoice.currency;
    else if (currency !== invoice.currency) {
      throw new DomainError('CURRENCY_MISMATCH', 'Invoices must share the same currency');
    }
  }
  return currency ?? 'NGN';
}

function hashPayload(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
