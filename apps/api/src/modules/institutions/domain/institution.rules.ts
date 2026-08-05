import { DomainError } from '@association/shared-kernel';

export type EmploymentStatus = 'active' | 'transferred' | 'ended';
export type InstitutionOwnership = 'public' | 'private';

export function normalizeInstitutionCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,32}$/.test(normalized)) {
    throw new DomainError('INVALID_INSTITUTION_CODE', 'Code must be 2–32 chars: A-Z, 0-9, _ or -');
  }
  return normalized;
}

export function assertInstitutionName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    throw new DomainError('INVALID_INSTITUTION_NAME', 'Institution name is required');
  }
  return trimmed;
}

export function assertInstitutionType(type: string): string {
  const trimmed = type.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_-]{1,63}$/.test(trimmed)) {
    throw new DomainError(
      'INVALID_INSTITUTION_TYPE',
      'Institution type must be a short slug (e.g. hospital, clinic)',
    );
  }
  return trimmed;
}
