import { describe, expect, it } from 'vitest';
import { DomainError } from '@association/shared-kernel';
import {
  assertCanActivateSchedule,
  assertInvoicePayable,
  nextInvoiceBalance,
  parseKobo,
  selectFeeRule,
} from './billing.rules';

describe('billing.rules', () => {
  it('parses kobo strings', () => {
    expect(parseKobo('5000000')).toBe(5_000_000n);
  });

  it('rejects float-like money', () => {
    expect(() => parseKobo('12.5')).toThrow(DomainError);
  });

  it('only activates draft schedules', () => {
    expect(() => assertCanActivateSchedule('active')).toThrow(DomainError);
    expect(() => assertCanActivateSchedule('draft')).not.toThrow();
  });

  it('selects lowest-priority matching fee rule', () => {
    const rule = selectFeeRule(
      [
        {
          id: 'a',
          membershipTypeId: null,
          institutionOwnership: null,
          minAge: null,
          maxAge: null,
          isOptionalExempt: false,
          amountKobo: 10_000n,
          priority: 200,
        },
        {
          id: 'b',
          membershipTypeId: 'mt1',
          institutionOwnership: null,
          minAge: null,
          maxAge: null,
          isOptionalExempt: false,
          amountKobo: 5_000n,
          priority: 50,
        },
      ],
      {
        membershipTypeId: 'mt1',
        institutionOwnership: null,
        age: 40,
        duesExempt: false,
      },
    );
    expect(rule?.id).toBe('b');
  });

  it('skips exempt members', () => {
    expect(
      selectFeeRule(
        [
          {
            id: 'a',
            membershipTypeId: null,
            institutionOwnership: null,
            minAge: null,
            maxAge: null,
            isOptionalExempt: true,
            amountKobo: 0n,
            priority: 1,
          },
        ],
        {
          membershipTypeId: 'mt1',
          institutionOwnership: null,
          age: 72,
          duesExempt: true,
        },
      ),
    ).toBeNull();
  });

  it('updates invoice balance status', () => {
    expect(nextInvoiceBalance(10_000n, 0n, 4_000n).status).toBe('partially_paid');
    expect(nextInvoiceBalance(10_000n, 4_000n, 6_000n).status).toBe('paid');
  });

  it('blocks payment on non-open invoices', () => {
    expect(() => assertInvoicePayable('paid')).toThrow(DomainError);
  });
});
