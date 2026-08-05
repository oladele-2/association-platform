import { DomainError } from '@association/shared-kernel';

export type FeeScheduleStatus = 'draft' | 'active' | 'closed';
export type FeePeriodType = 'annual' | 'one_time' | 'custom';
export type InvoiceStatus =
  'draft' | 'open' | 'partially_paid' | 'paid' | 'waived' | 'cancelled' | 'void';
export type PaymentStatus =
  'pending' | 'awaiting_verification' | 'succeeded' | 'failed' | 'rejected' | 'refunded';
export type BulkRemittanceStatus = 'draft' | 'submitted' | 'allocated' | 'closed';
export type MatchStatus = 'matched' | 'unmatched' | 'excluded';

export function normalizeFeeCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,32}$/.test(normalized)) {
    throw new DomainError(
      'INVALID_FEE_CODE',
      'Fee schedule code must be 2–32 chars: A-Z, 0-9, _ or -',
    );
  }
  return normalized;
}

export function assertCurrency(currency: string): string {
  const code = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    throw new DomainError('INVALID_CURRENCY', 'Currency must be a 3-letter code');
  }
  return code;
}

export function assertCanActivateSchedule(status: FeeScheduleStatus): void {
  if (status !== 'draft') {
    throw new DomainError('FEE_SCHEDULE_NOT_DRAFT', 'Only draft schedules can be activated');
  }
}

export function assertCanGenerateInvoices(status: FeeScheduleStatus): void {
  if (status !== 'active') {
    throw new DomainError(
      'FEE_SCHEDULE_NOT_ACTIVE',
      'Schedule must be active to generate invoices',
    );
  }
}

export function assertInvoicePayable(status: InvoiceStatus): void {
  if (status !== 'open' && status !== 'partially_paid') {
    throw new DomainError('INVOICE_NOT_PAYABLE', 'Invoice is not open for payment');
  }
}

export function assertPaymentAwaitingVerification(status: PaymentStatus): void {
  if (status !== 'awaiting_verification') {
    throw new DomainError('PAYMENT_NOT_AWAITING', 'Payment is not awaiting verification');
  }
}

export function assertPaymentPending(status: PaymentStatus): void {
  if (status !== 'pending') {
    throw new DomainError('PAYMENT_NOT_PENDING', 'Payment is not pending');
  }
}

export function parseKobo(value: string | number | bigint): bigint {
  if (typeof value === 'bigint') {
    if (value < 0n) throw new DomainError('INVALID_MONEY', 'Amount cannot be negative');
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0) {
      throw new DomainError('INVALID_MONEY', 'Amount must be a non-negative integer (kobo)');
    }
    return BigInt(value);
  }
  if (!/^\d+$/.test(value.trim())) {
    throw new DomainError('INVALID_MONEY', 'Amount must be an integer kobo string');
  }
  return BigInt(value.trim());
}

export function assertCanSubmitRemittance(status: BulkRemittanceStatus): void {
  if (status !== 'draft') {
    throw new DomainError('REMITTANCE_NOT_DRAFT', 'Only draft remittances can be submitted');
  }
}

export function assertRemittancePayable(status: BulkRemittanceStatus): void {
  if (status !== 'submitted' && status !== 'allocated') {
    throw new DomainError('REMITTANCE_NOT_PAYABLE', 'Remittance must be submitted before payment');
  }
}

/** Age in whole years at `asOf`, or null if DOB missing. */
export function ageInYears(dateOfBirth: Date | null | undefined, asOf = new Date()): number | null {
  if (!dateOfBirth) return null;
  let age = asOf.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const m = asOf.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (m < 0 || (m === 0 && asOf.getUTCDate() < dateOfBirth.getUTCDate())) age -= 1;
  return age;
}

export type FeeRuleMatchInput = {
  membershipTypeId: string;
  institutionOwnership: 'public' | 'private' | null;
  age: number | null;
  duesExempt: boolean;
};

export type FeeRuleCandidate = {
  id: string;
  membershipTypeId: string | null;
  institutionOwnership: 'public' | 'private' | null;
  minAge: number | null;
  maxAge: number | null;
  isOptionalExempt: boolean;
  amountKobo: bigint;
  priority: number;
};

/**
 * Lowest priority number wins.
 * - When `duesExempt`, skip rules marked `isOptionalExempt` (waivable).
 * - Forced rules (`isOptionalExempt: false`) still apply to exempt members.
 * Returns null when nothing matches.
 */
export function selectFeeRule(
  rules: FeeRuleCandidate[],
  member: FeeRuleMatchInput,
): FeeRuleCandidate | null {
  const matching = rules
    .filter((rule) => {
      if (member.duesExempt && rule.isOptionalExempt) return false;
      if (rule.membershipTypeId && rule.membershipTypeId !== member.membershipTypeId) {
        return false;
      }
      if (rule.institutionOwnership && rule.institutionOwnership !== member.institutionOwnership) {
        return false;
      }
      if (rule.minAge != null || rule.maxAge != null) {
        if (member.age == null) return false;
        if (rule.minAge != null && member.age < rule.minAge) return false;
        if (rule.maxAge != null && member.age > rule.maxAge) return false;
      }
      return true;
    })
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

  return matching[0] ?? null;
}

export function nextInvoiceBalance(
  amountDueKobo: bigint,
  amountPaidKobo: bigint,
  allocateKobo: bigint,
): { amountPaidKobo: bigint; status: InvoiceStatus } {
  const paid = amountPaidKobo + allocateKobo;
  if (paid > amountDueKobo) {
    throw new DomainError('OVER_ALLOCATION', 'Allocation exceeds invoice balance');
  }
  if (paid === 0n) return { amountPaidKobo: paid, status: 'open' };
  if (paid < amountDueKobo) return { amountPaidKobo: paid, status: 'partially_paid' };
  return { amountPaidKobo: paid, status: 'paid' };
}
