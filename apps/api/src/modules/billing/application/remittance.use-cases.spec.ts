import { describe, expect, it, vi } from 'vitest';
import {
  CreateBulkRemittanceUseCase,
  SubmitBulkRemittanceEvidenceUseCase,
  SubmitBulkRemittanceUseCase,
} from './remittance.use-cases';
import type { BillingRepository } from './ports/billing.repository';
import type { GetReadyFileUseCase } from '../../files/application/file.use-cases';

describe('CreateBulkRemittanceUseCase', () => {
  it('auto-matches line to open invoice by amount', async () => {
    const repo = {
      membershipNoLookup: vi.fn(),
      findOpenInvoicesForMember: vi.fn().mockResolvedValue([
        {
          id: 'inv1',
          memberId: 'm1',
          amountDueKobo: '5000',
          amountPaidKobo: '0',
          currency: 'NGN',
        },
      ]),
      createBulkRemittance: vi.fn().mockResolvedValue({ id: 'br1', lines: [] }),
    } as unknown as BillingRepository;

    const usecase = new CreateBulkRemittanceUseCase(repo);
    await usecase.execute({
      organizationId: 'o1',
      institutionId: 'i1',
      createdByUserId: 'u1',
      lines: [{ memberId: 'm1', amountKobo: '5000' }],
    });

    expect(repo.createBulkRemittance).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          expect.objectContaining({
            memberId: 'm1',
            invoiceId: 'inv1',
            matchStatus: 'matched',
            amountKobo: 5000n,
          }),
        ],
      }),
    );
  });
});

describe('SubmitBulkRemittanceUseCase', () => {
  it('rejects non-draft remittances', async () => {
    const repo = {
      findBulkRemittance: vi.fn().mockResolvedValue({
        id: 'br1',
        status: 'submitted',
        lines: [{ id: 'l1' }],
      }),
      updateBulkRemittance: vi.fn(),
    } as unknown as BillingRepository;

    const usecase = new SubmitBulkRemittanceUseCase(repo);
    await expect(usecase.execute('o1', 'br1')).rejects.toMatchObject({
      code: 'REMITTANCE_NOT_DRAFT',
    });
  });
});

describe('SubmitBulkRemittanceEvidenceUseCase', () => {
  it('rejects evidence amount that differs from matched lines', async () => {
    const repo = {
      findBulkRemittance: vi.fn().mockResolvedValue({
        id: 'br1',
        status: 'submitted',
        institutionId: 'i1',
        paymentId: null,
        periodLabel: null,
        lines: [
          {
            matchStatus: 'matched',
            invoiceId: 'inv1',
            amountKobo: '5000',
          },
        ],
      }),
      findInvoice: vi.fn().mockResolvedValue({ id: 'inv1', currency: 'NGN' }),
      createPayment: vi.fn(),
    } as unknown as BillingRepository;
    const getReadyFile = { execute: vi.fn() } as unknown as GetReadyFileUseCase;

    const usecase = new SubmitBulkRemittanceEvidenceUseCase(repo, getReadyFile);
    await expect(
      usecase.execute({
        organizationId: 'o1',
        remittanceId: 'br1',
        userId: 'u1',
        amountKobo: '4000',
      }),
    ).rejects.toMatchObject({ code: 'AMOUNT_MISMATCH' });
    expect(repo.createPayment).not.toHaveBeenCalled();
  });
});
