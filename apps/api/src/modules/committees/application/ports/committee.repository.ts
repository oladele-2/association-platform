export type CommitteeMemberView = {
  id: string;
  memberId: string | null;
  displayName: string;
  roleTitle: string | null;
  sortOrder: number;
  startedOn: string | null;
  endedOn: string | null;
};

export type CommitteeView = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  contentItemId: string | null;
  members: CommitteeMemberView[];
  createdAt: string;
  updatedAt: string;
};

export interface CommitteeRepository {
  list(organizationId: string): Promise<CommitteeView[]>;
  findById(organizationId: string, id: string): Promise<CommitteeView | null>;
  findBySlug(organizationId: string, slug: string): Promise<CommitteeView | null>;
  create(input: {
    organizationId: string;
    name: string;
    slug: string;
    description?: string | null;
    contentItemId?: string | null;
  }): Promise<CommitteeView>;
  update(input: {
    organizationId: string;
    id: string;
    name?: string;
    slug?: string;
    description?: string | null;
    contentItemId?: string | null;
  }): Promise<CommitteeView>;
  softDelete(organizationId: string, id: string): Promise<void>;
  replaceMembers(
    organizationId: string,
    committeeId: string,
    members: Array<{
      memberId?: string | null;
      displayName: string;
      roleTitle?: string | null;
      sortOrder?: number;
      startedOn?: string | null;
      endedOn?: string | null;
    }>,
  ): Promise<CommitteeView>;
}

export const COMMITTEE_REPOSITORY = Symbol('COMMITTEE_REPOSITORY');
