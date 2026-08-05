import { Injectable } from '@nestjs/common';
import { generateOpaqueToken, hashOpaqueToken } from '../domain/token-crypto';
import type {
  EmailVerificationTokenRepository,
  IssuedOpaqueToken,
} from '../application/ports/email-verification-token.repository';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaEmailVerificationTokenRepository implements EmailVerificationTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async issue(input: {
    organizationId: string;
    userId: string;
    expiresAt: Date;
  }): Promise<IssuedOpaqueToken> {
    const rawToken = generateOpaqueToken();
    const tokenHash = hashOpaqueToken(rawToken);

    const row = await this.prisma.asTenant(input.organizationId, async (tx) => {
      return tx.emailVerificationToken.create({
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
      const row = await tx.emailVerificationToken.findUnique({
        where: { tokenHash },
      });
      if (!row || row.usedAt || row.expiresAt.getTime() <= at.getTime()) {
        return null;
      }
      await tx.emailVerificationToken.update({
        where: { id: row.id },
        data: { usedAt: at },
      });
      return { organizationId: row.organizationId, userId: row.userId };
    });
  }
}
