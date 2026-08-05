import { DomainError } from '@association/shared-kernel';
import type { AuthUser } from './auth-user';

export class CredentialsPolicy {
  assertPasswordStrength(password: string): void {
    if (password.length < 10) {
      throw new DomainError('WEAK_PASSWORD', 'Password must be at least 10 characters');
    }
  }

  assertCredentialsMatch(user: AuthUser | null, passwordValid: boolean): AuthUser {
    if (!user || !passwordValid) {
      throw new DomainError('INVALID_CREDENTIALS', 'Invalid email or password');
    }
    user.assertCanLogin();
    return user;
  }
}
