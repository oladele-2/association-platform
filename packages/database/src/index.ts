import { PrismaClient } from '@prisma/client';

export { PrismaClient };
export * from '@prisma/client';

/**
 * Factory for a PrismaClient. Tenant RLS session vars are applied in Milestone 2/3
 * via interactive transactions (SET LOCAL app.organization_id).
 */
export function createPrismaClient(databaseUrl?: string): PrismaClient {
  return new PrismaClient(
    databaseUrl
      ? {
          datasources: {
            db: { url: databaseUrl },
          },
        }
      : undefined,
  );
}
