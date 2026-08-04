# ADR 0001: Multi-tenancy model

- **Status:** Accepted
- **Date:** 2026-08-04
- **Deciders:** Product / Architecture review
- **Related:** [Database architecture](../database/DATABASE_ARCHITECTURE.md), ADR 0002

## Context

The Association Management Platform must serve many independent associations (NMA Ogun, NMA Lagos, NBA branches, alumni groups, NGOs) from one codebase, with strong data isolation, custom domains, and acceptable cost/ops for an early commercial SaaS.

Candidate models:

1. Shared database + shared schema + `organization_id` (+ optional RLS)
2. Shared database + schema-per-tenant
3. Database-per-tenant

## Decision

Use **shared PostgreSQL database + shared schema** with:

- `organization_id` on every tenant-owned table
- **Row Level Security (FORCE RLS)** enforcing `organization_id = current_setting('app.organization_id')::uuid`
- Platform Operator bypass via `app.is_platform = 'true'` (separately authenticated)
- Tenant resolution from HTTP `Host` → `organization_domains.hostname` (Redis-cached)
- **Flat** organizations in v1 (no `parent_organization_id` / national→branch hierarchy)

NMA Ogun is the first tenant **seed/configuration only** — never hardcoded in application code.

## Consequences

### Positive

- Lowest ops cost; one migration pipeline; one connection pool
- Engine-level isolation defense in depth beyond application filters
- Custom domains and feature flags without deploying per customer

### Negative / risks

- Prisma connection pooling must not leak `SET LOCAL` tenant GUCs across requests (transaction-scoped session vars required)
- Noisy-neighbour risk at very large scale (mitigate later with read replicas / partitioning)
- Cross-org analytics requires platform role or dedicated reporting connection

### Follow-ups

- Milestone 2: apply RLS SQL + partial unique indexes
- Milestone 3: Host→org middleware + Redis cache
- Defer org hierarchy until a real national federation requirement appears
