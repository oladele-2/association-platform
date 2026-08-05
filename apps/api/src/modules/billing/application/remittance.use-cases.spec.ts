import { describe, expect, it, vi } from 'vitest';
import { CreateBulkRemittanceUseCase, SubmitBulkRemittanceUseCase } from './remittance.use-cases';
import type { BillingRepository } from './ports/billing.repository';

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
