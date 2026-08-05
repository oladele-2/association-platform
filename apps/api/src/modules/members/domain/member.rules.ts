import { DomainError } from '@association/shared-kernel';

export type MemberStatus = 'draft' | 'pending_approval' | 'active' | 'suspended' | 'archived';

export type Sex = 'male' | 'female' | 'other' | 'unspecified';

export function assertMemberCanActivate(status: MemberStatus): void {
  if (status === 'archived') {
    throw new DomainError('MEMBER_ARCHIVED', 'Archived members cannot be activated');
  }
  if (status === 'active') {
    throw new DomainError('MEMBER_ALREADY_ACTIVE', 'Member is already active');
  }
}

export function assertMemberCanSuspend(status: MemberStatus): void {
  if (status !== 'active') {
    throw new DomainError('MEMBER_NOT_ACTIVE', 'Only active members can be suspended');
  }
}

export function normalizeMembershipCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,32}$/.test(normalized)) {
    throw new DomainError(
      'INVALID_MEMBERSHIP_TYPE_CODE',
      'Code must be 2–32 chars: A-Z, 0-9, _ or -',
    );
  }
  return normalized;
}
