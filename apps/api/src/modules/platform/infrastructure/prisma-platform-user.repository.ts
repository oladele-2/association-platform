import { Injectable } from '@nestjs/common';
import { PlatformOperator } from '../domain/platform-operator';
import type { PlatformUserRepository } from '../application/ports/platform-user.repository';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaPlatformUserRepository implements PlatformUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<PlatformOperator | null> {
    return this.prisma.asPlatform(async (tx) => {
      const row = await tx.platformUser.findUnique({
        where: { email },
        include: { roles: { include: { role: true } } },
      });
      return row ? mapOperator(row) : null;
    });
  }

  async findById(id: string): Promise<PlatformOperator | null> {
    return this.prisma.asPlatform(async (tx) => {
      const row = await tx.platformUser.findUnique({
        where: { id },
        include: { roles: { include: { role: true } } },
      });
      return row ? mapOperator(row) : null;
    });
  }

  async count(): Promise<number> {
    return this.prisma.asPlatform((tx) => tx.platformUser.count());
  }

  async create(input: {
    email: string;
    name: string;
    passwordHash: string;
    roleKey: string;
  }): Promise<PlatformOperator> {
    return this.prisma.asPlatform(async (tx) => {
      const role = await tx.platformRole.findUnique({ where: { key: input.roleKey } });
      if (!role) {
        throw new Error(`Platform role ${input.roleKey} missing`);
      }
      const row = await tx.platformUser.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash: input.passwordHash,
          roles: { create: [{ platformRoleId: role.id }] },
        },
        include: { roles: { include: { role: true } } },
      });
      return mapOperator(row);
    });
  }

  async touchLastLogin(id: string, at: Date): Promise<void> {
    await this.prisma.asPlatform(async (tx) => {
      await tx.platformUser.update({
        where: { id },
        data: { lastLoginAt: at },
      });
    });
  }
}

function mapOperator(row: {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  status: 'active' | 'disabled';
  roles: Array<{ role: { key: string } }>;
}): PlatformOperator {
  return PlatformOperator.restore({
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.passwordHash,
    status: row.status,
    roleKeys: row.roles.map((r) => r.role.key),
  });
}
