import { describe, expect, it, vi } from 'vitest';
import {
  ActivateFeeScheduleUseCase,
  GenerateInvoicesUseCase,
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
            isOptionalExempt: false,
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
      listAllocations: vi.fn().mockResolvedValue([{ invoiceId: 'i1', amountKobo: 5000n }]),
      findInvoice: vi.fn().mockResolvedValue({
        id: 'i1',
        amountDueKobo: '5000',
        amountPaidKobo: '0',
        paidAt: null,
      }),
      updateInvoice: vi.fn().mockResolvedValue({ id: 'i1', status: 'paid' }),
      updatePayment: vi.fn().mockResolvedValue({
        id: 'p1',
        status: 'succeeded',
      }),
      nextInvoiceSequence: vi.fn().mockResolvedValue(1),
      createReceipt: vi.fn().mockResolvedValue({ id: 'r1' }),
      findBulkRemittanceByPaymentId: vi.fn().mockResolvedValue(null),
    } as unknown as BillingRepository;

    const usecase = new VerifyPaymentUseCase(repo);
    const result = await usecase.execute('o1', 'p1', 'u1');
    expect(result.status).toBe('succeeded');
    expect(repo.createReceipt).toHaveBeenCalled();
  });
});
