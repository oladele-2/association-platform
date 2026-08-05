import { describe, expect, it } from 'vitest';
import { DomainError } from '@association/shared-kernel';
import {
  assertMemberCanActivate,
  assertMemberCanSuspend,
  normalizeMembershipCode,
} from './member.rules';

describe('member.rules', () => {
  it('normalizes membership type codes', () => {
    expect(normalizeMembershipCode('standard')).toBe('STANDARD');
  });

  it('rejects invalid codes', () => {
    expect(() => normalizeMembershipCode('x')).toThrow(DomainError);
  });

  it('blocks activating archived members', () => {
    expect(() => assertMemberCanActivate('archived')).toThrow(
      expect.objectContaining({ code: 'MEMBER_ARCHIVED' }),
    );
  });

  it('allows activating draft members', () => {
    expect(() => assertMemberCanActivate('draft')).not.toThrow();
  });

  it('only suspends active members', () => {
    expect(() => assertMemberCanSuspend('draft')).toThrow(
      expect.objectContaining({ code: 'MEMBER_NOT_ACTIVE' }),
    );
    expect(() => assertMemberCanSuspend('active')).not.toThrow();
  });
});
