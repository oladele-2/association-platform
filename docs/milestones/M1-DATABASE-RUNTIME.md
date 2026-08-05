# Milestone 1 — Database runtime (completion report)

**Status:** Approved (2026-08-05)  
**Depends on:** Milestone 0 approved (2026-08-05, `17b06b9`)  
**Scope:** Neon Postgres runtime, Prisma migrations, RLS/partial indexes/CHECKs, Redis Compose, connectivity + RLS smoke. Do **not** treat later milestones as approved.

## Exit criteria

| Criterion | Status | Evidence |
|---|---|---|
| Neon as PostgreSQL host (`DATABASE_URL` + `DATABASE_URL_UNPOOLED`) | Done | Root + `packages/database` `.env` / `.env.example`; Prisma `url` + `directUrl` |
| Prisma baseline migration applied on Neon | Done | `20260804170000_init` — `prisma migrate status` → up to date |
| RLS helpers + FORCE policies + partial uniques + CHECKs | Done | `20260804170100_rls_and_partial_indexes` |
| Non-bypass `association_app` role for RLS-enforced access | Done | `20260804170200_app_role` |
| Docker Compose Redis for local queue/cache | Done | `docker-compose.yml` (`redis` + optional `postgres`) |
| Connectivity + RLS smoke tests | Done | `packages/database/src/rls.smoke.spec.ts` |
| Documentation | Done | This file + `docs/neon-setup.md` + `docs/MILESTONES.md` |
| `pnpm lint` / `pnpm build` / `pnpm test` green | Done (2026-08-05 harden) | Lint/build/test green; RLS smoke **3/3** against Neon (no `SKIP_DB_SMOKE`) |

## Harden pass (2026-08-05 review)

- **CI:** `prisma migrate deploy` against the workflow Postgres service before `pnpm test`; RLS smoke no longer auto-skips on `CI=true`.
- **Smoke skip:** only `SKIP_DB_SMOKE=true` (for machines without Neon / migrated local Postgres). Documented in `.env.example`.
- **Build hygiene:** `@association/database` build runs `rimraf dist` first; `src/test-setup.ts` stays excluded from `tsconfig` / published `dist`.
- **Docs:** Neon setup notes aligned with M1 (`directUrl`, `association_app` RLS).

## How to verify

```bash
# optional local Redis (and/or Postgres)
pnpm docker:up
# or: docker compose up -d redis

pnpm install
pnpm --filter @association/database prisma:migrate:status
pnpm lint
pnpm build
pnpm test
```

Smoke tests exercise Neon (or a migrated local Postgres) — RLS isolation between two org IDs via `SET LOCAL ROLE association_app`.

If the database is unavailable:

```bash
# PowerShell
$env:SKIP_DB_SMOKE='true'; pnpm test
```

CI always migrates its Postgres service and runs smoke (does **not** set `SKIP_DB_SMOKE`).

## What was intentionally not built

- Tenancy Host middleware / JWT → **M2**
- Identity / Platform modules → **M2 / M3**
- App DB dedicated login role (passworded) — `association_app` is `NOLOGIN`; sessions use `SET LOCAL ROLE` under the owner connection

## Review checklist

- [x] Migrations show as applied on Neon (`prisma migrate status`) — verified up to date on harden pass
- [x] RLS smoke tests pass (without `SKIP_DB_SMOKE`) — verified 3/3 on Neon
- [x] Redis starts via Docker Compose (`pnpm docker:up` or `docker compose up -d redis`) — compose service defined; live start needs Docker on the host
- [x] `pnpm lint && pnpm build && pnpm test` green — verified on harden pass
- [x] Approve M1 → authorize **Milestone 2** (Tenancy + Identity) only

**Approved** 2026-08-05 — Milestone 2 waits for explicit go-ahead.
