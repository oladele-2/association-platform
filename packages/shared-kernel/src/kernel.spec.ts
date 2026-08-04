import { describe, expect, it } from 'vitest';
import { DomainError } from './domain-error';
import { Money } from './money';
import { OrganizationId } from './organization-id';
import { err, ok } from './result';
import { createDomainEvent } from './domain-event';

describe('OrganizationId', () => {
  it('accepts a valid UUID', () => {
    const id = OrganizationId.from('550e8400-e29b-41d4-a716-446655440000');
    expect(id.toString()).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('rejects invalid values', () => {
    expect(() => OrganizationId.from('nma-ogun')).toThrow(DomainError);
  });
});

describe('Money', () => {
  it('adds amounts in the same currency', () => {
    const total = Money.of(100_00n, 'NGN').add(Money.of(50_00n, 'NGN'));
    expect(total.amountKobo).toBe(150_00n);
  });

  it('rejects currency mismatch', () => {
    expect(() => Money.of(1n, 'NGN').add(Money.of(1n, 'USD'))).toThrow(DomainError);
  });

  it('rejects negative amounts', () => {
    expect(() => Money.of(-1n, 'NGN')).toThrow(DomainError);
  });
});

describe('Result', () => {
  it('supports ok and err', () => {
    expect(ok(1).ok).toBe(true);
    expect(err(new Error('x')).ok).toBe(false);
  });
});

describe('DomainEvent', () => {
  it('creates an event envelope', () => {
    const event = createDomainEvent({
      eventId: '550e8400-e29b-41d4-a716-446655440001',
      eventType: 'MemberActivated',
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
      aggregateType: 'Member',
      aggregateId: '550e8400-e29b-41d4-a716-446655440002',
      payload: { membershipNo: 'OG/001' },
    });
    expect(event.eventType).toBe('MemberActivated');
    expect(event.payload.membershipNo).toBe('OG/001');
  });
});
