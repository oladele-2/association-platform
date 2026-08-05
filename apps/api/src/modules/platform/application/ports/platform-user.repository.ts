import type { PlatformOperator } from '../../domain/platform-operator';

export interface PlatformUserRepository {
  findByEmail(email: string): Promise<PlatformOperator | null>;
  findById(id: string): Promise<PlatformOperator | null>;
  count(): Promise<number>;
  create(input: {
    email: string;
    name: string;
    passwordHash: string;
    roleKey: string;
  }): Promise<PlatformOperator>;
  touchLastLogin(id: string, at: Date): Promise<void>;
}

export const PLATFORM_USER_REPOSITORY = Symbol('PLATFORM_USER_REPOSITORY');
