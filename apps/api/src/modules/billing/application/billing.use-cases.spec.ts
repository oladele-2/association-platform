import { describe, expect, it, vi } from 'vitest';
import {
  ActivateFeeScheduleUseCase,
  GenerateInvoicesUseCase,
  HandlePaystackWebhookUseCase,
  VerifyPaymentUseCase,
} from './billing.use-cases';
import type { BillingRepository } from './ports/billing.repository';

describe('ActivateFeeScheduleUseCase', () => {
  it('requires rules before activation', async () => {
    const repo = {
      findFeeSchedule: vi.fn().mockResolvedValue({
        id: 's1',
        status: 'draft',
        rules: [],
      }),
      updateFeeSchedule: vi.fn(),
    } as unknown as BillingRepository;

    const usecase = new ActivateFeeScheduleUseCase(repo);
    await expect(usecase.execute('o1', 's1')).rejects.toMatchObject({
      code: 'FEE_RULES_REQUIRED',
    });
  });
});

describe('GenerateInvoicesUseCase', () => {
  it('creates invoices for matching active members', async () => {
    const repo = {
      findFeeSchedule: vi.fn().mockResolvedValue({
        id: 's1',
        status: 'active',
        currency: 'NGN',
        periodYear: 2026,
        endsOn: '2026-12-31',
        rules: [
          {
            id: 'r1',
            membershipTypeId: null,
            institutionOwnership: null,
            minAge: null,
            maxAge: null,
            isOptionalExempt: true,
            amountKobo: '5000000',
            priority: 100,
          },
        ],
      }),
      listActiveMembersForBilling: vi.fn().mockResolvedValue([
        {
          id: 'm1',
          membershipTypeId: 'mt1',
          dateOfBirth: null,
          duesExempt: false,
          primaryInstitutionOwnership: null,
        },
        {
          id: 'm2',
          membershipTypeId: 'mt1',
          dateOfBirth: null,
          duesExempt: true,
          primaryInstitutionOwnership: null,
        },
      ]),
      findOpenInvoiceForMemberSchedule: vi.fn().mockResolvedValue(null),
      nextInvoiceSequence: vi.fn().mockResolvedValue(1),
      createInvoice: vi.fn().mockResolvedValue({ id: 'inv1' }),
    } as unknown as BillingRepository;

    const usecase = new GenerateInvoicesUseCase(repo);
    const result = await usecase.execute('o1', 's1');
    expect(result.created).toBe(1);
    expect(result.skipped).toBe(1);
    expect(repo.createInvoice).toHaveBeenCalledTimes(1);
  });
});

describe('VerifyPaymentUseCase', () => {
  it('settles awaiting payments', async () => {
    const repo = {
      findPayment: vi.fn().mockResolvedValue({
        id: 'p1',
        status: 'awaiting_verification',
        amountKobo: '5000',
      }),
      settleSucceededPayment: vi.fn().mockResolvedValue({
        payment: { id: 'p1', status: 'succeeded' },
        alreadySettled: false,
      }),
    } as unknown as BillingRepository;

    const usecase = new VerifyPaymentUseCase(repo);
    const result = await usecase.execute('o1', 'p1', 'u1');
    expect(result.status).toBe('succeeded');
    expect(repo.settleSucceededPayment).toHaveBeenCalledWith({
      organizationId: 'o1',
      paymentId: 'p1',
      actorUserId: 'u1',
      fromStatuses: ['awaiting_verification'],
    });
  });
});

describe('HandlePaystackWebhookUseCase', () => {
  it('rejects amount mismatch', async () => {
    const repo = {
      findPaymentByPaystackReference: vi.fn().mockResolvedValue({
        organizationId: 'o1',
        payment: {
          id: 'p1',
          status: 'pending',
          amountKobo: '5000',
          currency: 'NGN',
        },
      }),
      updatePaystackWebhook: vi.fn(),
      settleSucceededPayment: vi.fn(),
    } as unknown as BillingRepository;
    const gateway = {
      verifyWebhookSignature: vi.fn().mockReturnValue(true),
      verifyTransaction: vi.fn().mockResolvedValue({
        status: 'success',
        amountKobo: 999n,
        currency: 'NGN',
        reference: 'ref1',
        raw: {},
      }),
    };

    const usecase = new HandlePaystackWebhookUseCase(repo, gateway as never);
    await expect(
      usecase.execute({
        rawBody: '{}',
        signature: 'mock',
        event: { event: 'charge.success', data: { reference: 'ref1' } },
      }),
    ).rejects.toMatchObject({ code: 'AMOUNT_MISMATCH' });
    expect(repo.settleSucceededPayment).not.toHaveBeenCalled();
  });

  it('settles when verified amount and currency match', async () => {
    const repo = {
      findPaymentByPaystackReference: vi.fn().mockResolvedValue({
        organizationId: 'o1',
        payment: {
          id: 'p1',
          status: 'pending',
          amountKobo: '5000',
          currency: 'NGN',
        },
      }),
      updatePaystackWebhook: vi.fn(),
      settleSucceededPayment: vi.fn().mockResolvedValue({
        payment: { id: 'p1', status: 'succeeded' },
        alreadySettled: false,
      }),
    } as unknown as BillingRepository;
    const gateway = {
      verifyWebhookSignature: vi.fn().mockReturnValue(true),
      verifyTransaction: vi.fn().mockResolvedValue({
        status: 'success',
        amountKobo: 5000n,
        currency: 'NGN',
        reference: 'ref1',
        raw: {},
      }),
    };

    const usecase = new HandlePaystackWebhookUseCase(repo, gateway as never);
    const result = await usecase.execute({
      rawBody: '{}',
      signature: 'mock',
      event: { event: 'charge.success', data: { reference: 'ref1' } },
    });
    expect(result).toEqual({ ok: true });
    expect(repo.settleSucceededPayment).toHaveBeenCalledWith({
      organizationId: 'o1',
      paymentId: 'p1',
      fromStatuses: ['pending'],
    });
  });
});
