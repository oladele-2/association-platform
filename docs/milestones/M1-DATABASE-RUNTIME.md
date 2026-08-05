# Milestone 1 — Database runtime (completion report)

**Status:** Complete — awaiting review  
**Depends on:** Milestone 0 approved  

## Exit criteria

| Criterion | Status |
|---|---|
| Neon as PostgreSQL host (`DATABASE_URL` + `DATABASE_URL_UNPOOLED`) | Done |
| Prisma baseline migration applied on Neon | Done (`20260804170000_init`) |
| RLS helpers + FORCE policies + partial uniques + CHECKs | Done (`20260804170100_rls_and_partial_indexes`) |
| Non-bypass `association_app` role for RLS-enforced access | Done (`20260804170200_app_role`) |
| Docker Compose Redis for local queue/cache | Done (`docker-compose.yml`) |
| Connectivity + RLS smoke tests | Done (`packages/database/src/rls.smoke.spec.ts`) |
| Documentation | Done (this file + updated MILESTONES/ROADMAP) |
| `pnpm build` / `pnpm test` green | Required on review |

## How to verify

```bash
# optional local Redis
docker compose up -d redis

pnpm install
pnpm --filter @association/database prisma:migrate:status
pnpm build
pnpm test
```

Smoke tests exercise Neon (RLS isolation between two org IDs). Ensure `.env` has Neon URLs.

## What was intentionally not built

- Tenancy Host middleware / JWT → **M2**
- App DB role separate from owner → refine in later hardening  
- Identity / Platform modules → **M2 / M3**

## Review checklist

- [ ] Migrations show as applied on Neon  
- [ ] RLS smoke tests pass  
- [ ] Redis starts via Docker Compose (optional for M1 tests)  
- [ ] Approve M1 → authorize **Milestone 2** (Tenancy + Identity)  
