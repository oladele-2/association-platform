import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import { DEFAULT_PLAN_CODE, PLATFORM_ROLE_SUPER_ADMIN } from '../domain/feature-catalog';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../../identity/application/ports/password-hasher';
import {
  PLATFORM_USER_REPOSITORY,
  type PlatformUserRepository,
} from './ports/platform-user.repository';
import {
  ORGANIZATION_ADMIN_REPOSITORY,
  type OrganizationAdminRepository,
} from './ports/organization-admin.repository';

export type BootstrapPlatformCommand = {
  bootstrapSecret: string | undefined;
  providedSecret: string;
  email: string;
  name: string;
  password: string;
};

@Injectable()
export class BootstrapPlatformUseCase {
  constructor(
    @Inject(PLATFORM_USER_REPOSITORY) private readonly users: PlatformUserRepository,
    @Inject(ORGANIZATION_ADMIN_REPOSITORY)
    private readonly orgs: OrganizationAdminRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async execute(cmd: BootstrapPlatformCommand) {
    if (!cmd.bootstrapSecret) {
      throw new DomainError('BOOTSTRAP_DISABLED', 'PLATFORM_BOOTSTRAP_SECRET is not configured');
    }
    if (cmd.providedSecret !== cmd.bootstrapSecret) {
      throw new DomainError('BOOTSTRAP_FORBIDDEN', 'Invalid bootstrap secret');
    }
    if ((await this.users.count()) > 0) {
      throw new DomainError('BOOTSTRAP_ALREADY_DONE', 'Platform already bootstrapped');
    }
    if (cmd.password.length < 12) {
      throw new DomainError('WEAK_PASSWORD', 'Bootstrap password must be at least 12 characters');
    }

    await this.orgs.ensurePlatformRole(PLATFORM_ROLE_SUPER_ADMIN, 'Super Admin');
    await this.orgs.ensureDefaultPlan(DEFAULT_PLAN_CODE, 'Starter');

    const passwordHash = await this.hasher.hash(cmd.password);
    const operator = await this.users.create({
      email: cmd.email.trim().toLowerCase(),
      name: cmd.name.trim(),
      passwordHash,
      roleKey: PLATFORM_ROLE_SUPER_ADMIN,
    });

    return {
      id: operator.id,
      email: operator.email,
      name: operator.name,
      roles: operator.roleKeys,
    };
  }
}
