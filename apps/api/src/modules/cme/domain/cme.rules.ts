import { DomainError } from '@association/shared-kernel';

export type CmeStatus = 'pending' | 'approved' | 'rejected';

export function assertCmePending(status: CmeStatus): void {
  if (status !== 'pending') {
    throw new DomainError('CME_NOT_PENDING', 'Only pending CME submissions can be reviewed');
  }
}

export function assertCmeTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length < 2) {
    throw new DomainError('INVALID_TITLE', 'CME title is required');
  }
  return trimmed;
}

export function parseCreditHours(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 9999) {
    throw new DomainError('INVALID_CREDIT_HOURS', 'creditHours must be a non-negative number');
  }
  return n.toFixed(2);
}
