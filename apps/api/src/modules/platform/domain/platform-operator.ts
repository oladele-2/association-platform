import { DomainError } from '@association/shared-kernel';

export type PlatformUserStatus = 'active' | 'disabled';

export class PlatformOperator {
  private constructor(
    readonly id: string,
    readonly email: string,
    readonly name: string,
    readonly passwordHash: string,
    readonly status: PlatformUserStatus,
    readonly roleKeys: readonly string[],
  ) {}

  static restore(input: {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    status: PlatformUserStatus;
    roleKeys: string[];
  }): PlatformOperator {
    return new PlatformOperator(
      input.id,
      input.email.toLowerCase(),
      input.name,
      input.passwordHash,
      input.status,
      input.roleKeys,
    );
  }

  assertCanLogin(): void {
    if (this.status === 'disabled') {
      throw new DomainError('PLATFORM_USER_DISABLED', 'Platform account is disabled');
    }
  }
}
