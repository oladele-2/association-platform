import type { CmeStatus } from '../../domain/cme.rules';

export type CmeSubmissionView = {
  id: string;
  memberId: string;
  fileId: string;
  title: string;
  provider: string | null;
  creditHours: string | null;
  completedOn: string | null;
  status: CmeStatus;
  reviewerUserId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export interface CmeRepository {
  list(input: {
    organizationId: string;
    memberId?: string;
    status?: CmeStatus;
    page?: number;
    limit?: number;
  }): Promise<{ items: CmeSubmissionView[]; page: number; limit: number; total: number }>;
  findById(organizationId: string, id: string): Promise<CmeSubmissionView | null>;
  create(input: {
    organizationId: string;
    memberId: string;
    fileId: string;
    title: string;
    provider?: string | null;
    creditHours?: string | null;
    completedOn?: Date | null;
  }): Promise<CmeSubmissionView>;
  review(input: {
    organizationId: string;
    id: string;
    status: 'approved' | 'rejected';
    reviewerUserId: string;
    rejectionReason?: string | null;
  }): Promise<CmeSubmissionView>;
  /** CAS: only transitions from `pending`. Returns null if already reviewed / missing. */
  reviewIfPending(input: {
    organizationId: string;
    id: string;
    status: 'approved' | 'rejected';
    reviewerUserId: string;
    rejectionReason?: string | null;
  }): Promise<CmeSubmissionView | null>;
  findMemberIdByUserId(organizationId: string, userId: string): Promise<string | null>;
  findMemberUserId(organizationId: string, memberId: string): Promise<string | null>;
  writeOutbox(input: {
    organizationId: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
  createNotification(input: {
    organizationId: string;
    userId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<void>;
}

export const CME_REPOSITORY = Symbol('CME_REPOSITORY');
