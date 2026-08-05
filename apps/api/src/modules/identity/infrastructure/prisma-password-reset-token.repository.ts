import { Injectable } from '@nestjs/common';
import { generateOpaqueToken, hashOpaqueToken } from '../domain/token-crypto';
import type {
  IssuedOpaqueToken,
  PasswordResetTokenRepository,
} from '../application/ports/password-reset-token.repository';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaPasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async issue(input: {
    organizationId: string;
    userId: string;
    expiresAt: Date;
  }): Promise<IssuedOpaqueToken> {
    const rawToken = generateOpaqueToken();
    const tokenHash = hashOpaqueToken(rawToken);

    const row = await this.prisma.asTenant(input.organizationId, async (tx) => {
      return tx.passwordResetToken.create({
        data: {
          organizationId: input.organizationId,
          userId: input.userId,
          tokenHash,
          expiresAt: input.expiresAt,
        },
        select: { id: true, expiresAt: true },
      });
    });

    return { id: row.id, rawToken, expiresAt: row.expiresAt };
  }

  async consume(
    rawToken: string,
    at: Date,
  ): Promise<{ organizationId: string; userId: string } | null> {
    const tokenHash = hashOpaqueToken(rawToken);
    return this.prisma.asPlatform(async (tx) => {
      const row = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
      if (!row || row.usedAt || row.expiresAt.getTime() <= at.getTime()) {
        return null;
      }
      await tx.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: at },
      });
      return { organizationId: row.organizationId, userId: row.userId };
    });
  }
}
