import { DomainError } from '@association/shared-kernel';

export type UserStatus = 'invited' | 'active' | 'disabled';

export class AuthUser {
  private constructor(
    readonly id: string,
    readonly organizationId: string,
    readonly email: string,
    readonly passwordHash: string,
    readonly status: UserStatus,
    readonly emailVerifiedAt: Date | null,
    readonly mustResetPassword: boolean,
  ) {}

  static restore(input: {
    id: string;
    organizationId: string;
    email: string;
    passwordHash: string;
    status: UserStatus;
    emailVerifiedAt: Date | null;
    mustResetPassword: boolean;
  }): AuthUser {
    return new AuthUser(
      input.id,
      input.organizationId,
      input.email.toLowerCase(),
      input.passwordHash,
      input.status,
      input.emailVerifiedAt,
      input.mustResetPassword,
    );
  }

  assertCanLogin(): void {
    if (this.status === 'disabled') {
      throw new DomainError('USER_DISABLED', 'Account is disabled');
    }
    if (this.status === 'invited' && !this.emailVerifiedAt) {
      // invited users may login after verify; block if disabled only
    }
  }

  get isEmailVerified(): boolean {
    return this.emailVerifiedAt !== null;
  }

  withEmailVerified(at: Date): AuthUser {
    return AuthUser.restore({
      id: this.id,
      organizationId: this.organizationId,
      email: this.email,
      passwordHash: this.passwordHash,
      status: 'active',
      emailVerifiedAt: at,
      mustResetPassword: this.mustResetPassword,
    });
  }

  withPasswordHash(passwordHash: string): AuthUser {
    return AuthUser.restore({
      id: this.id,
      organizationId: this.organizationId,
      email: this.email,
      passwordHash,
      status: this.status === 'invited' ? 'active' : this.status,
      emailVerifiedAt: this.emailVerifiedAt,
      mustResetPassword: false,
    });
  }
}
