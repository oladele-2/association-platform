import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import {
  assertCmePending,
  assertCmeTitle,
  parseCreditHours,
  type CmeStatus,
} from '../domain/cme.rules';
import { CME_REPOSITORY, type CmeRepository } from './ports/cme.repository';
import { GetReadyFileUseCase } from '../../files/application/file.use-cases';

@Injectable()
export class ListCmeSubmissionsUseCase {
  constructor(@Inject(CME_REPOSITORY) private readonly repo: CmeRepository) {}
  execute(input: {
    organizationId: string;
    memberId?: string;
    status?: CmeStatus;
    page?: number;
    limit?: number;
  }) {
    return this.repo.list(input);
  }
}

@Injectable()
export class GetCmeSubmissionUseCase {
  constructor(@Inject(CME_REPOSITORY) private readonly repo: CmeRepository) {}
  async execute(organizationId: string, id: string) {
    const row = await this.repo.findById(organizationId, id);
    if (!row) throw new DomainError('CME_NOT_FOUND', 'CME submission not found');
    return row;
  }
}

@Injectable()
export class SubmitCmeUseCase {
  constructor(
    @Inject(CME_REPOSITORY) private readonly repo: CmeRepository,
    private readonly getReadyFile: GetReadyFileUseCase,
  ) {}

  async execute(input: {
    organizationId: string;
    userId: string;
    fileId: string;
    title: string;
    provider?: string | null;
    creditHours?: string | number | null;
    completedOn?: string | null;
  }) {
    const memberId = await this.repo.findMemberIdByUserId(input.organizationId, input.userId);
    if (!memberId) {
      throw new DomainError('MEMBER_PROFILE_NOT_FOUND', 'No member profile linked');
    }
    await this.getReadyFile.execute(input.organizationId, input.fileId);

    return this.repo.create({
      organizationId: input.organizationId,
      memberId,
      fileId: input.fileId,
      title: assertCmeTitle(input.title),
      provider: input.provider?.trim() || null,
      creditHours: parseCreditHours(input.creditHours),
      completedOn: input.completedOn ? new Date(input.completedOn) : null,
    });
  }
}

@Injectable()
export class ApproveCmeUseCase {
  constructor(@Inject(CME_REPOSITORY) private readonly repo: CmeRepository) {}

  async execute(organizationId: string, id: string, reviewerUserId: string) {
    const existing = await this.repo.findById(organizationId, id);
    if (!existing) throw new DomainError('CME_NOT_FOUND', 'CME submission not found');
    assertCmePending(existing.status);

    const updated = await this.repo.review({
      organizationId,
      id,
      status: 'approved',
      reviewerUserId,
    });

    await this.notify(organizationId, existing.memberId, id, true);
    return updated;
  }

  private async notify(
    organizationId: string,
    memberId: string,
    submissionId: string,
    approved: boolean,
  ) {
    const userId = await this.repo.findMemberUserId(organizationId, memberId);
    await this.repo.writeOutbox({
      organizationId,
      eventType: approved ? 'CmeApproved' : 'CmeRejected',
      aggregateType: 'cme_submission',
      aggregateId: submissionId,
      payload: { memberId, submissionId, approved },
    });
    if (userId) {
      await this.repo.createNotification({
        organizationId,
        userId,
        title: approved ? 'CME approved' : 'CME rejected',
        body: approved ? 'Your CME submission was approved.' : 'Your CME submission was rejected.',
        data: { submissionId, approved },
      });
    }
  }
}

@Injectable()
export class RejectCmeUseCase {
  constructor(@Inject(CME_REPOSITORY) private readonly repo: CmeRepository) {}

  async execute(organizationId: string, id: string, reviewerUserId: string, reason: string) {
    if (!reason.trim()) {
      throw new DomainError('REJECTION_REASON_REQUIRED', 'Rejection reason is required');
    }
    const existing = await this.repo.findById(organizationId, id);
    if (!existing) throw new DomainError('CME_NOT_FOUND', 'CME submission not found');
    assertCmePending(existing.status);

    const updated = await this.repo.review({
      organizationId,
      id,
      status: 'rejected',
      reviewerUserId,
      rejectionReason: reason.trim(),
    });

    const userId = await this.repo.findMemberUserId(organizationId, existing.memberId);
    await this.repo.writeOutbox({
      organizationId,
      eventType: 'CmeRejected',
      aggregateType: 'cme_submission',
      aggregateId: id,
      payload: { memberId: existing.memberId, submissionId: id, reason: reason.trim() },
    });
    if (userId) {
      await this.repo.createNotification({
        organizationId,
        userId,
        title: 'CME rejected',
        body: reason.trim(),
        data: { submissionId: id, approved: false },
      });
    }
    return updated;
  }
}

@Injectable()
export class ListMyCmeUseCase {
  constructor(@Inject(CME_REPOSITORY) private readonly repo: CmeRepository) {}

  async execute(organizationId: string, userId: string) {
    const memberId = await this.repo.findMemberIdByUserId(organizationId, userId);
    if (!memberId) {
      throw new DomainError('MEMBER_PROFILE_NOT_FOUND', 'No member profile linked');
    }
    return this.repo.list({ organizationId, memberId, limit: 100 });
  }

  async byId(organizationId: string, userId: string, id: string) {
    const memberId = await this.repo.findMemberIdByUserId(organizationId, userId);
    if (!memberId) {
      throw new DomainError('MEMBER_PROFILE_NOT_FOUND', 'No member profile linked');
    }
    const row = await this.repo.findById(organizationId, id);
    if (!row || row.memberId !== memberId) {
      throw new DomainError('CME_NOT_FOUND', 'CME submission not found');
    }
    return row;
  }
}
