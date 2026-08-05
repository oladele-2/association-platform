import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@association/database';
import { createPrismaClient } from '@association/database';
import type { AppEnv } from '../../config/env.validation';

type Tx = Prisma.TransactionClient;

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client: PrismaClient;

  constructor(config: ConfigService<AppEnv, true>) {
    this.client = createPrismaClient(config.get('DATABASE_URL', { infer: true }));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }

  /** Run work as platform operator (bypasses tenant RLS via app.is_platform). */
  asPlatform<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.client.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.is_platform', 'true', true)`;
      return fn(tx);
    });
  }

  /** Run work as tenant app role under a specific organization. */
  asTenant<T>(organizationId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.client.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE association_app`;
      await tx.$executeRaw`SELECT set_config('app.is_platform', 'false', true)`;
      await tx.$executeRaw`SELECT set_config('app.organization_id', ${organizationId}, true)`;
      return fn(tx);
    });
  }
}
