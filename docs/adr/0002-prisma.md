# ADR 0002: Prisma as the ORM / migration tool

- **Status:** Accepted
- **Date:** 2026-08-04
- **Deciders:** Product / Architecture review
- **Related:** ADR 0001, [schema.prisma](../database/schema.prisma)

## Context

The API is NestJS + TypeScript on PostgreSQL. We need type-safe persistence, manageable migrations, and clear separation so DDD repositories can hide the ORM behind ports.

Alternatives considered: raw `pg` / Knex, TypeORM, Drizzle, Prisma.

## Decision

Use **Prisma** as the default data-access toolkit for the modular monolith:

- Schema of record: `packages/database/prisma/schema.prisma`
- Prisma Migrate for structural DDL
- **Companion raw SQL migrations** for capabilities Prisma cannot express cleanly:
  - RLS policies and `FORCE ROW LEVEL SECURITY`
  - Partial unique indexes (`WHERE deleted_at IS NULL`, open-invoice uniqueness, etc.)
  - CHECK constraints for payer shape / money positivity where needed
- Domain and application layers **never** import `@prisma/client` directly from controllers; infrastructure adapters implement repository ports with Prisma
- Prefer interactive transactions with `SET LOCAL app.organization_id` for tenant-scoped work

## Consequences

### Positive

- Strong TypeScript client generation and rapid model iteration
- Fits monorepo `packages/database` boundary
- Good enough DX for a commercial MVP while keeping SQL escape hatches

### Negative / risks

- Prisma ↔ RLS pooling footguns (must be tested early)
- Some advanced SQL (partial indexes, complex CHECKs) lives outside the Prisma schema — discipline required to keep docs and SQL in sync
- N+1 / query patterns need explicit repository design (no automatic DDD aggregates)

### Follow-ups

- Milestone 2: baseline migration + RLS SQL package
- Document expand/contract migration rules for production
- Optional later: consider Prisma Accelerate / driver adapters only if pool issues force it
