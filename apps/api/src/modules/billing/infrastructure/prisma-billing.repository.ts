import { Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import { Prisma } from '@association/database';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type {
  FeePeriodType,
  FeeScheduleStatus,
  InvoiceStatus,
  PaymentStatus,
  BulkRemittanceStatus,
  MatchStatus,
} from '../domain/billing.rules';
import type {
  BillingRepository,
  BulkRemittanceView,
  FeeRuleView,
  FeeScheduleView,
  InvoiceView,
  MemberForBilling,
  PaymentView,
  ReceiptView,
} from '../application/ports/billing.repository';

@Injectable()
export class PrismaBillingRepository implements BillingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listFeeSchedules(organizationId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const rows = await tx.feeSchedule.findMany({
        where: { organizationId },
        orderBy: [{ periodYear: 'desc' }, { code: 'asc' }],
      });
      return rows.map(mapSchedule);
    });
  }

  async findFeeSchedule(organizationId: string, id: string, withRules = false) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.feeSchedule.findFirst({
        where: { id, organizationId },
        include: withRules ? { rules: { orderBy: { priority: 'asc' } } } : undefined,
      });
      if (!row) return null;
      return {
        ...mapSchedule(row),
        rules: withRules && 'rules' in row ? (row.rules as never[]).map(mapRule) : [],
      };
    });
  }

  async createFeeSchedule(input: {
    organizationId: string;
    code: string;
    name: string;
    periodType: FeePeriodType;
    periodYear?: number | null;
    currency: string;
    startsOn?: Date | null;
    endsOn?: Date | null;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      try {
        const row = await tx.feeSchedule.create({
          data: {
            organizationId: input.organizationId,
            code: input.code,
            name: input.name,
            periodType: input.periodType,
            periodYear: input.periodYear ?? null,
            currency: input.currency,
            startsOn: input.startsOn ?? null,
            endsOn: input.endsOn ?? null,
          },
        });
        return mapSchedule(row);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new DomainError('CODE_TAKEN', 'Fee schedule code already exists');
        }
        throw err;
      }
    });
  }

  async updateFeeSchedule(input: {
    organizationId: string;
    id: string;
    name?: string;
    periodYear?: number | null;
    startsOn?: Date | null;
    endsOn?: Date | null;
    status?: FeeScheduleStatus;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      await tx.feeSchedule.updateMany({
        where: { id: input.id, organizationId: input.organizationId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.periodYear !== undefined ? { periodYear: input.periodYear } : {}),
          ...(input.startsOn !== undefined ? { startsOn: input.startsOn } : {}),
          ...(input.endsOn !== undefined ? { endsOn: input.endsOn } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
      });
      const row = await tx.feeSchedule.findFirst({
        where: { id: input.id, organizationId: input.organizationId },
      });
      if (!row) throw new DomainError('FEE_SCHEDULE_NOT_FOUND', 'Fee schedule not found');
      return mapSchedule(row);
    });
  }

  async createFeeRule(input: {
    organizationId: string;
    feeScheduleId: string;
    membershipTypeId?: string | null;
    institutionOwnership?: 'public' | 'private' | null;
    minAge?: number | null;
    maxAge?: number | null;
    isOptionalExempt?: boolean;
    amountKobo: bigint;
    priority?: number;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const row = await tx.feeRule.create({
        data: {
          organizationId: input.organizationId,
          feeScheduleId: input.feeScheduleId,
          membershipTypeId: input.membershipTypeId ?? null,
          institutionOwnership: input.institutionOwnership ?? null,
          minAge: input.minAge ?? null,
          maxAge: input.maxAge ?? null,
          isOptionalExempt: input.isOptionalExempt ?? false,
          amountKobo: input.amountKobo,
          priority: input.priority ?? 100,
        },
      });
      return mapRule(row);
    });
  }

  async updateFeeRule(input: {
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
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      await tx.feeRule.updateMany({
        where: {
          id: input.ruleId,
          feeScheduleId: input.feeScheduleId,
          organizationId: input.organizationId,
        },
        data: {
          ...(input.membershipTypeId !== undefined
            ? { membershipTypeId: input.membershipTypeId }
            : {}),
          ...(input.institutionOwnership !== undefined
            ? { institutionOwnership: input.institutionOwnership }
            : {}),
          ...(input.minAge !== undefined ? { minAge: input.minAge } : {}),
          ...(input.maxAge !== undefined ? { maxAge: input.maxAge } : {}),
          ...(input.isOptionalExempt !== undefined
            ? { isOptionalExempt: input.isOptionalExempt }
            : {}),
          ...(input.amountKobo !== undefined ? { amountKobo: input.amountKobo } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
        },
      });
      const row = await tx.feeRule.findFirst({
        where: {
          id: input.ruleId,
          feeScheduleId: input.feeScheduleId,
          organizationId: input.organizationId,
        },
      });
      if (!row) throw new DomainError('FEE_RULE_NOT_FOUND', 'Fee rule not found');
      return mapRule(row);
    });
  }

  async deleteFeeRule(organizationId: string, feeScheduleId: string, ruleId: string) {
    await this.prisma.asTenant(organizationId, async (tx) => {
      const result = await tx.feeRule.deleteMany({
        where: { id: ruleId, feeScheduleId, organizationId },
      });
      if (result.count === 0) throw new DomainError('FEE_RULE_NOT_FOUND', 'Fee rule not found');
    });
  }

  async listActiveMembersForBilling(organizationId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const rows = await tx.member.findMany({
        where: { organizationId, deletedAt: null, status: 'active' },
        include: { primaryInstitution: true },
      });
      return rows.map(mapMemberBilling);
    });
  }

  async findMemberForBilling(organizationId: string, memberId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.member.findFirst({
        where: { id: memberId, organizationId, deletedAt: null },
        include: { primaryInstitution: true },
      });
      return row ? mapMemberBilling(row) : null;
    });
  }

  async findMemberByUserId(organizationId: string, userId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.member.findFirst({
        where: { organizationId, userId, deletedAt: null },
        include: { primaryInstitution: true },
      });
      return row ? mapMemberBilling(row) : null;
    });
  }

  async findUserEmail(organizationId: string, userId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.user.findFirst({
        where: { id: userId, organizationId, deletedAt: null },
        select: { email: true },
      });
      return row?.email ?? null;
    });
  }

  async findOpenInvoiceForMemberSchedule(
    organizationId: string,
    memberId: string,
    feeScheduleId: string,
  ) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.invoice.findFirst({
        where: {
          organizationId,
          memberId,
          feeScheduleId,
          status: { notIn: ['cancelled', 'void'] },
        },
      });
      return row ? mapInvoice(row) : null;
    });
  }

  async createInvoice(input: {
    organizationId: string;
    memberId: string;
    feeScheduleId: string;
    invoiceNo: string;
    currency: string;
    amountDueKobo: bigint;
    status: InvoiceStatus;
    dueOn?: Date | null;
    issuedAt?: Date | null;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const row = await tx.invoice.create({
        data: {
          organizationId: input.organizationId,
          memberId: input.memberId,
          feeScheduleId: input.feeScheduleId,
          invoiceNo: input.invoiceNo,
          currency: input.currency,
          amountDueKobo: input.amountDueKobo,
          status: input.status,
          dueOn: input.dueOn ?? null,
          issuedAt: input.issuedAt ?? null,
        },
      });
      return mapInvoice(row);
    });
  }

  async listInvoices(input: {
    organizationId: string;
    memberId?: string;
    status?: InvoiceStatus;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, input.page ?? 1);
    const limit = Math.min(100, Math.max(1, input.limit ?? 20));
    const skip = (page - 1) * limit;
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const where: Prisma.InvoiceWhereInput = {
        organizationId: input.organizationId,
        ...(input.memberId ? { memberId: input.memberId } : {}),
        ...(input.status ? { status: input.status } : {}),
      };
      const [total, rows] = await Promise.all([
        tx.invoice.count({ where }),
        tx.invoice.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);
      return { items: rows.map(mapInvoice), page, limit, total };
    });
  }

  async findInvoice(organizationId: string, id: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.invoice.findFirst({ where: { id, organizationId } });
      return row ? mapInvoice(row) : null;
    });
  }

  async updateInvoice(input: {
    organizationId: string;
    id: string;
    status?: InvoiceStatus;
    amountPaidKobo?: bigint;
    waivedReason?: string | null;
    paidAt?: Date | null;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      await tx.invoice.updateMany({
        where: { id: input.id, organizationId: input.organizationId },
        data: {
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.amountPaidKobo !== undefined ? { amountPaidKobo: input.amountPaidKobo } : {}),
          ...(input.waivedReason !== undefined ? { waivedReason: input.waivedReason } : {}),
          ...(input.paidAt !== undefined ? { paidAt: input.paidAt } : {}),
        },
      });
      const row = await tx.invoice.findFirst({
        where: { id: input.id, organizationId: input.organizationId },
      });
      if (!row) throw new DomainError('INVOICE_NOT_FOUND', 'Invoice not found');
      return mapInvoice(row);
    });
  }

  async nextInvoiceSequence(organizationId: string, prefix: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      if (prefix.startsWith('RCP-')) {
        const count = await tx.receipt.count({
          where: { organizationId, receiptNo: { startsWith: prefix } },
        });
        return count + 1;
      }
      const count = await tx.invoice.count({
        where: { organizationId, invoiceNo: { startsWith: prefix } },
      });
      return count + 1;
    });
  }

  async createPayment(input: {
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
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const row = await tx.payment.create({
        data: {
          organizationId: input.organizationId,
          payerType: input.payerType,
          memberId: input.memberId ?? null,
          institutionId: input.institutionId ?? null,
          channel: input.channel,
          currency: input.currency,
          amountKobo: input.amountKobo,
          status: input.status,
          reference: input.reference,
          narration: input.narration ?? null,
          initiatedByUserId: input.initiatedByUserId ?? null,
        },
      });
      return mapPayment(row);
    });
  }

  async createAllocations(
    organizationId: string,
    paymentId: string,
    lines: { invoiceId: string; amountKobo: bigint }[],
  ) {
    await this.prisma.asTenant(organizationId, async (tx) => {
      await tx.paymentAllocation.createMany({
        data: lines.map((line) => ({
          organizationId,
          paymentId,
          invoiceId: line.invoiceId,
          amountKobo: line.amountKobo,
        })),
      });
    });
  }

  async createPaystackTransaction(input: {
    organizationId: string;
    paymentId: string;
    paystackReference: string;
    accessCode?: string | null;
    authorizationUrl?: string | null;
    rawInitialize?: unknown;
  }) {
    await this.prisma.asTenant(input.organizationId, async (tx) => {
      await tx.paystackTransaction.create({
        data: {
          organizationId: input.organizationId,
          paymentId: input.paymentId,
          paystackReference: input.paystackReference,
          accessCode: input.accessCode ?? null,
          authorizationUrl: input.authorizationUrl ?? null,
          rawInitialize:
            input.rawInitialize === undefined
              ? undefined
              : (input.rawInitialize as Prisma.InputJsonValue),
        },
      });
    });
  }

  async createPaymentEvidence(input: {
    organizationId: string;
    paymentId: string;
    fileId: string;
    bankName?: string | null;
    transferReference?: string | null;
    transferredAt?: Date | null;
    note?: string | null;
  }) {
    await this.prisma.asTenant(input.organizationId, async (tx) => {
      try {
        await tx.paymentEvidence.create({
          data: {
            organizationId: input.organizationId,
            paymentId: input.paymentId,
            fileId: input.fileId,
            bankName: input.bankName ?? null,
            transferReference: input.transferReference ?? null,
            transferredAt: input.transferredAt ?? null,
            note: input.note ?? null,
          },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
          throw new DomainError('FILE_NOT_FOUND', 'Evidence file not found');
        }
        throw err;
      }
    });
  }

  async findPayment(organizationId: string, id: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.payment.findFirst({
        where: { id, organizationId },
        include: { paystackTxns: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      return row ? mapPayment(row, row.paystackTxns[0]?.authorizationUrl) : null;
    });
  }

  async findPaymentByReference(organizationId: string, reference: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.payment.findFirst({ where: { organizationId, reference } });
      return row ? mapPayment(row) : null;
    });
  }

  async findPaymentByPaystackReference(paystackReference: string) {
    // Cross-tenant lookup via platform role (webhook has no tenant header)
    return this.prisma.asPlatform(async (tx) => {
      const txn = await tx.paystackTransaction.findUnique({
        where: { paystackReference },
        include: { payment: true },
      });
      if (!txn) return null;
      return {
        organizationId: txn.organizationId,
        payment: mapPayment(txn.payment, txn.authorizationUrl),
      };
    });
  }

  async listPayments(input: {
    organizationId: string;
    memberId?: string;
    institutionId?: string;
    status?: PaymentStatus;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, input.page ?? 1);
    const limit = Math.min(100, Math.max(1, input.limit ?? 20));
    const skip = (page - 1) * limit;
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const where: Prisma.PaymentWhereInput = {
        organizationId: input.organizationId,
        ...(input.memberId ? { memberId: input.memberId } : {}),
        ...(input.institutionId ? { institutionId: input.institutionId } : {}),
        ...(input.status ? { status: input.status } : {}),
      };
      const [total, rows] = await Promise.all([
        tx.payment.count({ where }),
        tx.payment.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);
      return { items: rows.map((r) => mapPayment(r)), page, limit, total };
    });
  }

  async listAllocations(organizationId: string, paymentId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const rows = await tx.paymentAllocation.findMany({
        where: { organizationId, paymentId },
      });
      return rows.map((r) => ({ invoiceId: r.invoiceId, amountKobo: r.amountKobo }));
    });
  }

  async updatePayment(input: {
    organizationId: string;
    id: string;
    status?: PaymentStatus;
    paidAt?: Date | null;
    verifiedByUserId?: string | null;
    verifiedAt?: Date | null;
    rejectionReason?: string | null;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      await tx.payment.updateMany({
        where: { id: input.id, organizationId: input.organizationId },
        data: {
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.paidAt !== undefined ? { paidAt: input.paidAt } : {}),
          ...(input.verifiedByUserId !== undefined
            ? { verifiedByUserId: input.verifiedByUserId }
            : {}),
          ...(input.verifiedAt !== undefined ? { verifiedAt: input.verifiedAt } : {}),
          ...(input.rejectionReason !== undefined
            ? { rejectionReason: input.rejectionReason }
            : {}),
        },
      });
      const row = await tx.payment.findFirst({
        where: { id: input.id, organizationId: input.organizationId },
      });
      if (!row) throw new DomainError('PAYMENT_NOT_FOUND', 'Payment not found');
      return mapPayment(row);
    });
  }

  async updatePaystackWebhook(input: {
    paystackReference: string;
    rawWebhook?: unknown;
    verifiedPayload?: unknown;
  }) {
    await this.prisma.asPlatform(async (tx) => {
      await tx.paystackTransaction.update({
        where: { paystackReference: input.paystackReference },
        data: {
          ...(input.rawWebhook !== undefined
            ? { rawWebhook: input.rawWebhook as Prisma.InputJsonValue }
            : {}),
          ...(input.verifiedPayload !== undefined
            ? { verifiedPayload: input.verifiedPayload as Prisma.InputJsonValue }
            : {}),
        },
      });
    });
  }

  async createReceipt(input: {
    organizationId: string;
    paymentId: string;
    receiptNo: string;
    issuedAt: Date;
    issuedByUserId?: string | null;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const row = await tx.receipt.create({
        data: {
          organizationId: input.organizationId,
          paymentId: input.paymentId,
          receiptNo: input.receiptNo,
          issuedAt: input.issuedAt,
          issuedByUserId: input.issuedByUserId ?? null,
        },
      });
      return mapReceipt(row);
    });
  }

  async listReceipts(organizationId: string, memberId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const rows = await tx.receipt.findMany({
        where: {
          organizationId,
          payment: { memberId },
        },
        orderBy: { issuedAt: 'desc' },
      });
      return rows.map(mapReceipt);
    });
  }

  async findReceipt(organizationId: string, id: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.receipt.findFirst({ where: { id, organizationId } });
      return row ? mapReceipt(row) : null;
    });
  }

  async getIdempotency(organizationId: string, key: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.idempotencyKey.findUnique({
        where: { organizationId_key: { organizationId, key } },
      });
      if (!row) return null;
      if (row.expiresAt.getTime() < Date.now()) return null;
      return {
        requestHash: row.requestHash,
        responseCode: row.responseCode,
        responseBody: row.responseBody,
      };
    });
  }

  async saveIdempotency(input: {
    organizationId: string;
    key: string;
    requestHash: string;
    responseCode: number;
    responseBody: unknown;
    expiresAt: Date;
  }) {
    await this.prisma.asTenant(input.organizationId, async (tx) => {
      await tx.idempotencyKey.upsert({
        where: {
          organizationId_key: { organizationId: input.organizationId, key: input.key },
        },
        create: {
          organizationId: input.organizationId,
          key: input.key,
          requestHash: input.requestHash,
          responseCode: input.responseCode,
          responseBody: input.responseBody as Prisma.InputJsonValue,
          expiresAt: input.expiresAt,
        },
        update: {
          requestHash: input.requestHash,
          responseCode: input.responseCode,
          responseBody: input.responseBody as Prisma.InputJsonValue,
          expiresAt: input.expiresAt,
        },
      });
    });
  }

  async listBulkRemittances(input: {
    organizationId: string;
    institutionId?: string;
    status?: BulkRemittanceStatus;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const rows = await tx.bulkRemittance.findMany({
        where: {
          organizationId: input.organizationId,
          ...(input.institutionId ? { institutionId: input.institutionId } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
        include: { lines: true },
        orderBy: { createdAt: 'desc' },
      });
      return rows.map(mapRemittance);
    });
  }

  async findBulkRemittance(organizationId: string, id: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.bulkRemittance.findFirst({
        where: { id, organizationId },
        include: { lines: true },
      });
      return row ? mapRemittance(row) : null;
    });
  }

  async createBulkRemittance(input: {
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
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const row = await tx.bulkRemittance.create({
        data: {
          organizationId: input.organizationId,
          institutionId: input.institutionId,
          periodLabel: input.periodLabel ?? null,
          createdByUserId: input.createdByUserId ?? null,
          lines: {
            create: input.lines.map((line) => ({
              organizationId: input.organizationId,
              memberId: line.memberId ?? null,
              memberExternalRef: line.memberExternalRef ?? null,
              amountKobo: line.amountKobo,
              matchStatus: line.matchStatus,
              invoiceId: line.invoiceId ?? null,
            })),
          },
        },
        include: { lines: true },
      });
      return mapRemittance(row);
    });
  }

  async updateBulkRemittance(input: {
    organizationId: string;
    id: string;
    status?: BulkRemittanceStatus;
    paymentId?: string | null;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      await tx.bulkRemittance.updateMany({
        where: { id: input.id, organizationId: input.organizationId },
        data: {
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.paymentId !== undefined ? { paymentId: input.paymentId } : {}),
        },
      });
      const row = await tx.bulkRemittance.findFirst({
        where: { id: input.id, organizationId: input.organizationId },
        include: { lines: true },
      });
      if (!row) throw new DomainError('REMITTANCE_NOT_FOUND', 'Bulk remittance not found');
      return mapRemittance(row);
    });
  }

  async updateBulkRemittanceLine(input: {
    organizationId: string;
    remittanceId: string;
    lineId: string;
    memberId?: string | null;
    invoiceId?: string | null;
    matchStatus?: MatchStatus;
    amountKobo?: bigint;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      await tx.bulkRemittanceLine.updateMany({
        where: {
          id: input.lineId,
          bulkRemittanceId: input.remittanceId,
          organizationId: input.organizationId,
        },
        data: {
          ...(input.memberId !== undefined ? { memberId: input.memberId } : {}),
          ...(input.invoiceId !== undefined ? { invoiceId: input.invoiceId } : {}),
          ...(input.matchStatus !== undefined ? { matchStatus: input.matchStatus } : {}),
          ...(input.amountKobo !== undefined ? { amountKobo: input.amountKobo } : {}),
        },
      });
      const row = await tx.bulkRemittanceLine.findFirst({
        where: {
          id: input.lineId,
          bulkRemittanceId: input.remittanceId,
          organizationId: input.organizationId,
        },
      });
      if (!row) throw new DomainError('REMITTANCE_LINE_NOT_FOUND', 'Remittance line not found');
      return mapRemittanceLine(row);
    });
  }

  async findOpenInvoicesForMember(organizationId: string, memberId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const rows = await tx.invoice.findMany({
        where: {
          organizationId,
          memberId,
          status: { in: ['open', 'partially_paid'] },
        },
        orderBy: { createdAt: 'asc' },
      });
      return rows.map(mapInvoice);
    });
  }

  async findBulkRemittanceByPaymentId(organizationId: string, paymentId: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.bulkRemittance.findFirst({
        where: { organizationId, paymentId },
        include: { lines: true },
      });
      return row ? mapRemittance(row) : null;
    });
  }

  async membershipNoLookup(organizationId: string, membershipNo: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.member.findFirst({
        where: {
          organizationId,
          deletedAt: null,
          membershipNo: { equals: membershipNo, mode: 'insensitive' },
        },
        select: { id: true },
      });
      return row?.id ?? null;
    });
  }
}

function mapSchedule(row: {
  id: string;
  code: string;
  name: string;
  periodType: FeePeriodType;
  periodYear: number | null;
  currency: string;
  status: FeeScheduleStatus;
  startsOn: Date | null;
  endsOn: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): FeeScheduleView {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    periodType: row.periodType,
    periodYear: row.periodYear,
    currency: row.currency,
    status: row.status,
    startsOn: row.startsOn ? row.startsOn.toISOString().slice(0, 10) : null,
    endsOn: row.endsOn ? row.endsOn.toISOString().slice(0, 10) : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapRule(row: {
  id: string;
  feeScheduleId: string;
  membershipTypeId: string | null;
  institutionOwnership: 'public' | 'private' | null;
  minAge: number | null;
  maxAge: number | null;
  isOptionalExempt: boolean;
  amountKobo: bigint;
  priority: number;
}): FeeRuleView {
  return {
    id: row.id,
    feeScheduleId: row.feeScheduleId,
    membershipTypeId: row.membershipTypeId,
    institutionOwnership: row.institutionOwnership,
    minAge: row.minAge,
    maxAge: row.maxAge,
    isOptionalExempt: row.isOptionalExempt,
    amountKobo: row.amountKobo.toString(),
    priority: row.priority,
  };
}

function mapInvoice(row: {
  id: string;
  memberId: string;
  feeScheduleId: string;
  invoiceNo: string;
  currency: string;
  amountDueKobo: bigint;
  amountPaidKobo: bigint;
  status: InvoiceStatus;
  dueOn: Date | null;
  waivedReason: string | null;
  issuedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
}): InvoiceView {
  return {
    id: row.id,
    memberId: row.memberId,
    feeScheduleId: row.feeScheduleId,
    invoiceNo: row.invoiceNo,
    currency: row.currency,
    amountDueKobo: row.amountDueKobo.toString(),
    amountPaidKobo: row.amountPaidKobo.toString(),
    status: row.status,
    dueOn: row.dueOn ? row.dueOn.toISOString().slice(0, 10) : null,
    waivedReason: row.waivedReason,
    issuedAt: row.issuedAt?.toISOString() ?? null,
    paidAt: row.paidAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapPayment(
  row: {
    id: string;
    payerType: 'member' | 'institution';
    memberId: string | null;
    institutionId: string | null;
    channel: 'paystack' | 'manual' | 'bulk_institution';
    currency: string;
    amountKobo: bigint;
    status: PaymentStatus;
    reference: string;
    narration: string | null;
    paidAt: Date | null;
    verifiedAt: Date | null;
    rejectionReason: string | null;
    createdAt: Date;
  },
  authorizationUrl?: string | null,
): PaymentView {
  return {
    id: row.id,
    payerType: row.payerType,
    memberId: row.memberId,
    institutionId: row.institutionId,
    channel: row.channel,
    currency: row.currency,
    amountKobo: row.amountKobo.toString(),
    status: row.status,
    reference: row.reference,
    narration: row.narration,
    paidAt: row.paidAt?.toISOString() ?? null,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt.toISOString(),
    authorizationUrl: authorizationUrl ?? null,
  };
}

function mapReceipt(row: {
  id: string;
  paymentId: string;
  receiptNo: string;
  issuedAt: Date;
  fileId: string | null;
}): ReceiptView {
  return {
    id: row.id,
    paymentId: row.paymentId,
    receiptNo: row.receiptNo,
    issuedAt: row.issuedAt.toISOString(),
    fileId: row.fileId,
  };
}

function mapMemberBilling(row: {
  id: string;
  userId: string | null;
  membershipTypeId: string;
  dateOfBirth: Date | null;
  duesExempt: boolean;
  status: string;
  alternateEmail: string | null;
  primaryInstitution?: { ownership: 'public' | 'private' | null } | null;
}): MemberForBilling {
  return {
    id: row.id,
    userId: row.userId,
    membershipTypeId: row.membershipTypeId,
    dateOfBirth: row.dateOfBirth,
    duesExempt: row.duesExempt,
    status: row.status,
    alternateEmail: row.alternateEmail,
    primaryInstitutionOwnership: row.primaryInstitution?.ownership ?? null,
  };
}

function mapRemittanceLine(row: {
  id: string;
  memberId: string | null;
  memberExternalRef: string | null;
  amountKobo: bigint;
  matchStatus: MatchStatus;
  invoiceId: string | null;
}) {
  return {
    id: row.id,
    memberId: row.memberId,
    memberExternalRef: row.memberExternalRef,
    amountKobo: row.amountKobo.toString(),
    matchStatus: row.matchStatus,
    invoiceId: row.invoiceId,
  };
}

function mapRemittance(row: {
  id: string;
  institutionId: string;
  paymentId: string | null;
  status: BulkRemittanceStatus;
  periodLabel: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lines: {
    id: string;
    memberId: string | null;
    memberExternalRef: string | null;
    amountKobo: bigint;
    matchStatus: MatchStatus;
    invoiceId: string | null;
  }[];
}): BulkRemittanceView {
  const lines = row.lines.map(mapRemittanceLine);
  const total = row.lines
    .filter((l) => l.matchStatus !== 'excluded')
    .reduce((sum, l) => sum + l.amountKobo, 0n);
  return {
    id: row.id,
    institutionId: row.institutionId,
    paymentId: row.paymentId,
    status: row.status,
    periodLabel: row.periodLabel,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lines,
    totalAmountKobo: total.toString(),
  };
}
