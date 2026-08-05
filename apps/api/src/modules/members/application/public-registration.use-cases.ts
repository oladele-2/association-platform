import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DomainError } from '@association/shared-kernel';
import { AuthUser } from '../../identity/domain/auth-user';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../../identity/application/ports/password-hasher';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../identity/application/ports/user.repository';
import type { Sex } from '../domain/member.rules';
import {
  assertHoneypotEmpty,
  assertRegistrationEmail,
  assertRegistrationPassword,
  RegistrationRateLimiter,
} from '../domain/registration.rules';
import { MEMBER_REPOSITORY, type MemberRepository } from './ports/member.repository';
import {
  INSTITUTION_REPOSITORY,
  type InstitutionRepository,
} from '../../institutions/application/ports/institution.repository';

const rateLimiter = new RegistrationRateLimiter(8, 15 * 60 * 1000);

@Injectable()
export class GetPublicRegistrationCatalogUseCase {
  constructor(
    @Inject(MEMBER_REPOSITORY) private readonly members: MemberRepository,
    @Inject(INSTITUTION_REPOSITORY) private readonly institutions: InstitutionRepository,
  ) {}

  async execute(organizationId: string) {
    const [types, fields, institutionPage] = await Promise.all([
      this.members.listMembershipTypes(organizationId),
      this.members.listFieldDefinitions(organizationId),
      this.institutions.listInstitutions({
        organizationId,
        page: 1,
        limit: 200,
      }),
    ]);
    return {
      membershipTypes: types.map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        isDefault: t.isDefault,
      })),
      institutions: institutionPage.items.map((i) => ({
        id: i.id,
        name: i.name,
        code: i.code,
      })),
      fields: fields
        .filter((f) => f.visibility === 'public' || f.visibility === 'admin_and_member')
        .map((f) => ({
          key: f.key,
          label: f.label,
          dataType: f.dataType,
          options: f.options,
          isRequired: f.isRequired,
          sortOrder: f.sortOrder,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    };
  }
}

@Injectable()
export class SubmitPublicRegistrationUseCase {
  constructor(
    @Inject(MEMBER_REPOSITORY) private readonly members: MemberRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: {
    organizationId: string;
    clientKey: string;
    honeypot: Record<string, unknown>;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    title?: string | null;
    phone?: string | null;
    sex?: Sex | null;
    dateOfBirth?: string | null;
    membershipTypeId?: string | null;
    primaryInstitutionId?: string | null;
    customFields?: Record<string, unknown>;
  }) {
    rateLimiter.assertAllowed(`${input.organizationId}:${input.clientKey}`);
    assertHoneypotEmpty(input.honeypot);
    const email = assertRegistrationEmail(input.email);
    assertRegistrationPassword(input.password);
    if (!input.firstName.trim() || !input.lastName.trim()) {
      throw new DomainError('INVALID_NAME', 'firstName and lastName are required');
    }

    const existing = await this.users.findByEmail(input.organizationId, email);
    if (existing) {
      throw new DomainError('EMAIL_TAKEN', 'An account with this email already exists');
    }

    let membershipTypeId = input.membershipTypeId ?? undefined;
    if (!membershipTypeId) {
      membershipTypeId = (await this.members.ensureDefaultMembershipType(input.organizationId)).id;
    }

    const passwordHash = await this.hasher.hash(input.password);
    const user = AuthUser.createActive({
      id: randomUUID(),
      organizationId: input.organizationId,
      email,
      passwordHash,
    });
    await this.users.create(user);

    const member = await this.members.createMember({
      organizationId: input.organizationId,
      membershipTypeId,
      title: input.title?.trim() || null,
      firstName: input.firstName.trim(),
      middleName: input.middleName?.trim() || null,
      lastName: input.lastName.trim(),
      sex: input.sex ?? null,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
      phone: input.phone?.trim() || null,
      alternateEmail: email,
      primaryInstitutionId: input.primaryInstitutionId || null,
      userId: user.id,
      joinedOn: new Date(),
      status: 'active',
      metadata: {
        source: 'public_self_registration',
        showWelcome: true,
        customFields: input.customFields ?? {},
      },
    });

    return {
      memberId: member.id,
      email,
      message: 'Registration successful. You can sign in to the member portal or mobile app.',
    };
  }
}
