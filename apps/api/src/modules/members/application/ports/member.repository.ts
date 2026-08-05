import type { MemberStatus, Sex } from '../../domain/member.rules';

export type MembershipTypeView = {
  id: string;
  code: string;
  name: string;
  isDefault: boolean;
  sortOrder: number;
};

export type MemberView = {
  id: string;
  organizationId: string;
  userId: string | null;
  membershipTypeId: string;
  membershipTypeCode: string | null;
  membershipTypeName: string | null;
  membershipNo: string | null;
  title: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  sex: Sex | null;
  dateOfBirth: string | null;
  phone: string | null;
  alternateEmail: string | null;
  photographFileId: string | null;
  primaryInstitutionId: string | null;
  status: MemberStatus;
  activatedAt: string | null;
  duesExempt: boolean;
  duesExemptReason: string | null;
  joinedOn: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type FieldDefinitionView = {
  id: string;
  key: string;
  label: string;
  dataType: string;
  options: unknown;
  isRequired: boolean;
  isUnique: boolean;
  sortOrder: number;
  visibility: string;
};

export interface MemberRepository {
  listMembershipTypes(organizationId: string): Promise<MembershipTypeView[]>;
  ensureDefaultMembershipType(organizationId: string): Promise<MembershipTypeView>;
  createMembershipType(input: {
    organizationId: string;
    code: string;
    name: string;
    isDefault?: boolean;
    sortOrder?: number;
  }): Promise<MembershipTypeView>;
  updateMembershipType(input: {
    organizationId: string;
    id: string;
    name?: string;
    isDefault?: boolean;
    sortOrder?: number;
  }): Promise<MembershipTypeView>;

  listMembers(input: {
    organizationId: string;
    status?: MemberStatus;
    q?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: MemberView[]; page: number; limit: number; total: number }>;

  findMemberById(organizationId: string, id: string): Promise<MemberView | null>;
  findMemberByUserId(organizationId: string, userId: string): Promise<MemberView | null>;

  createMember(input: {
    organizationId: string;
    membershipTypeId: string;
    membershipNo?: string | null;
    title?: string | null;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    sex?: Sex | null;
    dateOfBirth?: Date | null;
    phone?: string | null;
    alternateEmail?: string | null;
    photographFileId?: string | null;
    primaryInstitutionId?: string | null;
    userId?: string | null;
    joinedOn?: Date | null;
    metadata?: Record<string, unknown>;
    status?: MemberStatus;
  }): Promise<MemberView>;

  updateMember(input: {
    organizationId: string;
    id: string;
    membershipTypeId?: string;
    membershipNo?: string | null;
    title?: string | null;
    firstName?: string;
    middleName?: string | null;
    lastName?: string;
    sex?: Sex | null;
    dateOfBirth?: Date | null;
    phone?: string | null;
    alternateEmail?: string | null;
    photographFileId?: string | null;
    primaryInstitutionId?: string | null;
    userId?: string | null;
    joinedOn?: Date | null;
    metadata?: Record<string, unknown>;
    status?: MemberStatus;
    activatedAt?: Date | null;
    duesExempt?: boolean;
    duesExemptReason?: string | null;
    duesExemptApprovedById?: string | null;
    duesExemptApprovedAt?: Date | null;
  }): Promise<MemberView>;

  softDeleteMember(organizationId: string, id: string): Promise<void>;

  listFieldDefinitions(organizationId: string): Promise<FieldDefinitionView[]>;
  createFieldDefinition(input: {
    organizationId: string;
    key: string;
    label: string;
    dataType: string;
    options?: unknown;
    isRequired?: boolean;
    isUnique?: boolean;
    sortOrder?: number;
    visibility?: string;
  }): Promise<FieldDefinitionView>;
  updateFieldDefinition(input: {
    organizationId: string;
    id: string;
    label?: string;
    options?: unknown;
    isRequired?: boolean;
    isUnique?: boolean;
    sortOrder?: number;
    visibility?: string;
  }): Promise<FieldDefinitionView>;
  softDeleteFieldDefinition(organizationId: string, id: string): Promise<void>;
}

export const MEMBER_REPOSITORY = Symbol('MEMBER_REPOSITORY');
