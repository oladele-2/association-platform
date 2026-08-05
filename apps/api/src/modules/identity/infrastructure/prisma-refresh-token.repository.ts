import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { generateOpaqueToken } from '../domain/token-crypto';
import type {
  IssuedRefreshToken,
  RefreshTokenRepository,
  StoredRefreshToken,
} from '../application/ports/refresh-token.repository';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { AppEnv } from '../../../config/env.validation';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  private hash(raw: string): string {
    const secret = this.config.get('JWT_REFRESH_SECRET', { infer: true });
    return createHmac('sha256', secret).update(raw).digest('hex');
  }

  async issue(input: {
    organizationId: string;
    userId: string;
    familyId: string;
    expiresAt: Date;
    userAgent?: string | null;
    ip?: string | null;
  }): Promise<IssuedRefreshToken> {
    const rawToken = generateOpaqueToken();
    const tokenHash = this.hash(rawToken);

    const row = await this.prisma.asTenant(input.organizationId, async (tx) => {
      return tx.refreshToken.create({
        data: {
          organizationId: input.organizationId,
          userId: input.userId,
          tokenHash,
          familyId: input.familyId,
          expiresAt: input.expiresAt,
          userAgent: input.userAgent ?? null,
          ip: sanitizeIp(input.ip),
        },
        select: { id: true, familyId: true, expiresAt: true },
      });
    });

    return {
      id: row.id,
      familyId: row.familyId,
      rawToken,
      expiresAt: row.expiresAt,
    };
  }

  async findByRawToken(rawToken: string): Promise<StoredRefreshToken | null> {
    if (!rawToken) return null;
    const tokenHash = this.hash(rawToken);
    return this.prisma.asPlatform(async (tx) => {
      const row = await tx.refreshToken.findUnique({ where: { tokenHash } });
      if (!row) return null;
      return {
        id: row.id,
        organizationId: row.organizationId,
        userId: row.userId,
        familyId: row.familyId,
        expiresAt: row.expiresAt,
        revokedAt: row.revokedAt,
        replacedById: row.replacedById,
      };
    });
  }

  async rotate(input: {
    current: StoredRefreshToken;
    expiresAt: Date;
    userAgent?: string | null;
    ip?: string | null;
  }): Promise<IssuedRefreshToken> {
    const rawToken = generateOpaqueToken();
    const tokenHash = this.hash(rawToken);
    const { current } = input;

    return this.prisma.asTenant(current.organizationId, async (tx) => {
      const created = await tx.refreshToken.create({
        data: {
          organizationId: current.organizationId,
          userId: current.userId,
          tokenHash,
          familyId: current.familyId,
          expiresAt: input.expiresAt,
          userAgent: input.userAgent ?? null,
          ip: sanitizeIp(input.ip),
        },
        select: { id: true, familyId: true, expiresAt: true },
      });

      await tx.refreshToken.update({
        where: { id: current.id },
        data: {
          revokedAt: new Date(),
          replacedById: created.id,
        },
      });

      return {
        id: created.id,
        familyId: created.familyId,
        rawToken,
        expiresAt: created.expiresAt,
      };
    });
  }

  async revokeFamily(organizationId: string, familyId: string, at: Date): Promise<void> {
    await this.prisma.asTenant(organizationId, async (tx) => {
      await tx.refreshToken.updateMany({
        where: { organizationId, familyId, revokedAt: null },
        data: { revokedAt: at },
      });
    });
  }

  async revokeByRawToken(rawToken: string, at: Date): Promise<boolean> {
    if (!rawToken) return false;
    const tokenHash = this.hash(rawToken);
    return this.prisma.asPlatform(async (tx) => {
      const row = await tx.refreshToken.findUnique({ where: { tokenHash } });
      if (!row || row.revokedAt) return false;
      await tx.refreshToken.update({
        where: { id: row.id },
        data: { revokedAt: at },
      });
      return true;
    });
  }

  async revokeAllForUser(organizationId: string, userId: string, at: Date): Promise<void> {
    await this.prisma.asTenant(organizationId, async (tx) => {
      await tx.refreshToken.updateMany({
        where: { organizationId, userId, revokedAt: null },
        data: { revokedAt: at },
      });
    });
  }
}

function sanitizeIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const cleaned = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  if (cleaned === '::1') return '127.0.0.1';
  if (/^[\d.]+$/.test(cleaned) || cleaned.includes(':')) return cleaned;
  return null;
}
