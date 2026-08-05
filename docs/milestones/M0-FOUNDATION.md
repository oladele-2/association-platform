# Milestone 0 — Project foundation (completion report)

**Status:** Approved (2026-08-05)  
**Scope:** Foundation tooling and monorepo baseline (exit criteria below).  
**Later milestones** (M1+) may already exist in this repo; this report only certifies **M0**.

## Exit criteria (from `docs/MILESTONES.md`)

| Criterion | Status | Evidence |
|---|---|---|
| pnpm + Turborepo monorepo | Done | Root `package.json`, `pnpm-workspace.yaml`, `turbo.json` |
| Root docs + ADRs + Cursor rules | Done | `ARCHITECTURE.md`, `CODING_STANDARDS.md`, `SECURITY.md`, `CURSOR_RULES.md`, `docs/adr/*`, `.cursor/rules/*.mdc` (tracked in git) |
| `shared-kernel` unit tests | Done | `pnpm --filter @association/shared-kernel test` |
| Prisma schema validates | Done | `pnpm --filter @association/database prisma:validate` |
| Nest API builds with `/v1/health` | Done | `HealthService` → `{ status: 'ok', milestone: 0 }`; Swagger `/docs` |
| `pnpm lint && pnpm build && pnpm test` green | Done | Verified on review harden pass; CI runs the same gates |

## Foundation checklist

| Task | Status |
|---|---|
| Turborepo + pnpm workspaces | Done |
| TypeScript (`packages/typescript-config`) | Done |
| ESLint (`packages/eslint-config`, root `eslint.config.mjs`) | Done |
| Prettier (`.prettierrc.json`, `format:check` in CI) | Done |
| Husky + lint-staged | Done |
| Docker Compose (Postgres 16 + Redis 7) | Done |
| Prisma package (`packages/database`) | Done |
| `.env.example` + API env validation | Done |
| Logging (nestjs-pino) | Done |
| GitHub Actions CI (format, lint, build, test, prisma validate) | Done |

## Harden pass (this review)

- Track `.cursor/rules/*.mdc` in git (was previously ignored under `.cursor/`).
- CI: add `format:check`; run full `pnpm test` with `CI=true` / `SKIP_DB_SMOKE`; use ≥16-char JWT secrets and `APP_PUBLIC_URL`.
- Prettier clean for previously unformatted HTML / root ESLint config.

## Verify

```bash
pnpm install
pnpm docker:up          # optional local Postgres + Redis
pnpm format:check
pnpm lint
pnpm build
pnpm test               # set SKIP_DB_SMOKE=true if no Neon/local DB for RLS smoke
pnpm --filter @association/database prisma:validate
```

API (with `.env` present):

- `GET /v1/health` → `status: ok`, `milestone: 0`
- Swagger UI: `/docs`

## Review gate

**Approved 2026-08-05.** Milestone 0 is closed.  
Do not start Milestone 1 (or any later milestone) until you give an explicit go-ahead.
