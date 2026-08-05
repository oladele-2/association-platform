import { PrismaClient } from '@prisma/client';

/**
 * Factory for PrismaClient.
 * Tenant RLS session vars (app.organization_id / app.is_platform) must be set with
 * set_config(..., true) inside interactive transactions — see Milestone 2 tenancy module.
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
