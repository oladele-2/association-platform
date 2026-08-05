import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';

/** Skip only when explicitly requested (no live Neon / Postgres with migrations). */
const skipSmoke = process.env.SKIP_DB_SMOKE === 'true';

/**
 * DB smoke tests (Neon or local Postgres with migrations applied).
 * Set SKIP_DB_SMOKE=true when the database is unavailable.
 * CI migrates the workflow Postgres service and leaves this unset so smoke runs.
 */
const prisma = new PrismaClient();

describe.skipIf(skipSmoke)('Database connectivity', () => {
  it('connects and answers SELECT 1', async () => {
    const rows = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1::int AS ok`;
    expect(rows[0]?.ok).toBe(1);
  });

  it('exposes RLS helper functions when migrations are applied', async () => {
    const rows = await prisma.$queryRaw<Array<{ platform: boolean }>>`
      SELECT app_is_platform() AS platform
    `;
    expect(typeof rows[0]?.platform).toBe('boolean');
  });
});

describe.skipIf(skipSmoke)('Row Level Security', () => {
  const orgA = '11111111-1111-4111-8111-111111111111';
  const orgB = '22222222-2222-4222-8222-222222222222';

  afterAll(async () => {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.is_platform', 'true', true)`;
      await tx.$executeRaw`
        DELETE FROM organizations
        WHERE id = CAST(${orgA} AS uuid) OR id = CAST(${orgB} AS uuid)
      `;
    });
    await prisma.$disconnect();
  });

  it('isolates organization rows by app.organization_id', async () => {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.is_platform', 'true', true)`;
      await tx.$executeRaw`
        INSERT INTO organizations (
          id, slug, legal_name, display_name, org_type, status, created_at, updated_at
        )
        VALUES
          (CAST(${orgA} AS uuid), 'm1-smoke-a', 'Smoke Org A', 'Smoke A', 'other', 'active', NOW(), NOW()),
          (CAST(${orgB} AS uuid), 'm1-smoke-b', 'Smoke Org B', 'Smoke B', 'other', 'active', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `;
    });

    const onlyA = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE association_app`;
      await tx.$executeRaw`SELECT set_config('app.is_platform', 'false', true)`;
      await tx.$executeRaw`SELECT set_config('app.organization_id', ${orgA}, true)`;
      return tx.$queryRaw<Array<{ id: string }>>`
        SELECT id::text AS id FROM organizations WHERE slug LIKE 'm1-smoke-%' ORDER BY slug
      `;
    });

    expect(onlyA.map((r) => r.id)).toEqual([orgA]);

    const onlyB = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE association_app`;
      await tx.$executeRaw`SELECT set_config('app.is_platform', 'false', true)`;
      await tx.$executeRaw`SELECT set_config('app.organization_id', ${orgB}, true)`;
      return tx.$queryRaw<Array<{ id: string }>>`
        SELECT id::text AS id FROM organizations WHERE slug LIKE 'm1-smoke-%' ORDER BY slug
      `;
    });

    expect(onlyB.map((r) => r.id)).toEqual([orgB]);
  });
});
