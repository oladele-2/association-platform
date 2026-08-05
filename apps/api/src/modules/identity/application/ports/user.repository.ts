import type { AuthUser } from '../../domain/auth-user';

export interface UserRepository {
  findByEmail(organizationId: string, email: string): Promise<AuthUser | null>;
  findById(organizationId: string, userId: string): Promise<AuthUser | null>;
  /** Persist a new user row (self-registration / invite). */
  create(user: AuthUser): Promise<void>;
  save(user: AuthUser): Promise<void>;
  touchLastLogin(organizationId: string, userId: string, at: Date): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
