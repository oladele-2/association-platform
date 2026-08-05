import type { EmploymentStatus, InstitutionOwnership } from '../../domain/institution.rules';

export type InstitutionView = {
  id: string;
  organizationId: string;
  code: string | null;
  name: string;
  institutionType: string;
  ownership: InstitutionOwnership | null;
  state: string | null;
  lga: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  isAgpmpnMember: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type InstitutionMemberLinkView = {
  id: string;
  institutionId: string;
  memberId: string;
  employmentStatus: EmploymentStatus;
  isPrimary: boolean;
  startedOn: string | null;
  endedOn: string | null;
  memberFirstName?: string | null;
  memberLastName?: string | null;
  membershipNo?: string | null;
};

export type InstitutionAdminView = {
  id: string;
  institutionId: string;
  userId: string;
  createdAt: string;
};

export interface InstitutionRepository {
  listInstitutions(input: {
    organizationId: string;
    q?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: InstitutionView[]; page: number; limit: number; total: number }>;

  findById(organizationId: string, id: string): Promise<InstitutionView | null>;

  createInstitution(input: {
    organizationId: string;
    code?: string | null;
    name: string;
    institutionType: string;
    ownership?: InstitutionOwnership | null;
    state?: string | null;
    lga?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    isAgpmpnMember?: boolean;
    status?: string;
  }): Promise<InstitutionView>;

  updateInstitution(input: {
    organizationId: string;
    id: string;
    code?: string | null;
    name?: string;
    institutionType?: string;
    ownership?: InstitutionOwnership | null;
    state?: string | null;
    lga?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    isAgpmpnMember?: boolean;
    status?: string;
  }): Promise<InstitutionView>;

  softDeleteInstitution(organizationId: string, id: string): Promise<void>;

  listAdmins(organizationId: string, institutionId: string): Promise<InstitutionAdminView[]>;
  assignAdmin(input: {
    organizationId: string;
    institutionId: string;
    userId: string;
  }): Promise<InstitutionAdminView>;
  revokeAdmin(organizationId: string, institutionId: string, adminId: string): Promise<void>;
  isInstitutionAdmin(
    organizationId: string,
    institutionId: string,
    userId: string,
  ): Promise<boolean>;
  listInstitutionsForAdmin(organizationId: string, userId: string): Promise<InstitutionView[]>;

  listMembers(organizationId: string, institutionId: string): Promise<InstitutionMemberLinkView[]>;
  linkMember(input: {
    organizationId: string;
    institutionId: string;
    memberId: string;
    employmentStatus?: EmploymentStatus;
    isPrimary?: boolean;
    startedOn?: Date | null;
    endedOn?: Date | null;
  }): Promise<InstitutionMemberLinkView>;
  updateMemberLink(input: {
    organizationId: string;
    institutionId: string;
    linkId: string;
    employmentStatus?: EmploymentStatus;
    isPrimary?: boolean;
    startedOn?: Date | null;
    endedOn?: Date | null;
  }): Promise<InstitutionMemberLinkView>;
  unlinkMember(organizationId: string, institutionId: string, linkId: string): Promise<void>;
  memberExists(organizationId: string, memberId: string): Promise<boolean>;
}

export const INSTITUTION_REPOSITORY = Symbol('INSTITUTION_REPOSITORY');
