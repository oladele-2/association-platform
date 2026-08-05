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

/** Accepts `YYYY-MM-DD` or a parseable ISO datetime; rejects Invalid Date. */
export function parseCompletedOn(value: string | null | undefined): Date | null {
  if (value === null || value === undefined || value.trim() === '') return null;
  const raw = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(raw) && Number.isNaN(Date.parse(raw))) {
    throw new DomainError('INVALID_COMPLETED_ON', 'completedOn must be a valid date');
  }
  const date = new Date(raw.includes('T') ? raw : `${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new DomainError('INVALID_COMPLETED_ON', 'completedOn must be a valid date');
  }
  return date;
}
