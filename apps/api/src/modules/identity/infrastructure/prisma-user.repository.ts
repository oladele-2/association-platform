import { Injectable } from '@nestjs/common';
import { AuthUser, type UserStatus } from '../domain/auth-user';
import type { UserRepository } from '../application/ports/user.repository';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(organizationId: string, email: string): Promise<AuthUser | null> {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.user.findFirst({
        where: {
          organizationId,
          email: { equals: email, mode: 'insensitive' },
          deletedAt: null,
        },
      });
      return row ? mapUser(row) : null;
    });
  }

  async findById(organizationId: string, userId: string): Promise<AuthUser | null> {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.user.findFirst({
        where: { id: userId, organizationId, deletedAt: null },
      });
      return row ? mapUser(row) : null;
    });
  }

  async create(user: AuthUser): Promise<void> {
    await this.prisma.asTenant(user.organizationId, async (tx) => {
      await tx.user.create({
        data: {
          id: user.id,
          organizationId: user.organizationId,
          email: user.email,
          passwordHash: user.passwordHash,
          status: user.status,
          emailVerifiedAt: user.emailVerifiedAt,
          mustResetPassword: user.mustResetPassword,
        },
      });
    });
  }

  async save(user: AuthUser): Promise<void> {
    await this.prisma.asTenant(user.organizationId, async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash: user.passwordHash,
          emailVerifiedAt: user.emailVerifiedAt,
          status: user.status,
          mustResetPassword: user.mustResetPassword,
        },
      });
    });
  }

  async touchLastLogin(organizationId: string, userId: string, at: Date): Promise<void> {
    await this.prisma.asTenant(organizationId, async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { lastLoginAt: at },
      });
    });
  }
}

function mapUser(row: {
  id: string;
  organizationId: string;
  email: string;
  passwordHash: string;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  mustResetPassword: boolean;
}): AuthUser {
  return AuthUser.restore({
    id: row.id,
    organizationId: row.organizationId,
    email: row.email,
    passwordHash: row.passwordHash,
    status: row.status,
    emailVerifiedAt: row.emailVerifiedAt,
    mustResetPassword: row.mustResetPassword,
  });
}
