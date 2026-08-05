# Milestone 0 — Project foundation (completion report)

**Status:** Complete — awaiting review  
**Scope:** Foundation tooling only. **No business modules.**

## Checklist

| Task | Status |
|---|---|
| Turborepo structure | Done |
| pnpm workspaces | Done |
| TypeScript (`packages/typescript-config`) | Done |
| ESLint (`packages/eslint-config` + package configs) | Done |
| Prettier (`.prettierrc.json`) | Done |
| Husky (`.husky/pre-commit`) | Done |
| lint-staged (root `package.json`) | Done |
| Docker Compose (Postgres 16 + Redis 7) | Done |
| PostgreSQL (Compose local + Neon via env) | Done |
| Redis (Compose) | Done |
| Prisma (`packages/database`) | Done |
| Environment variables (`.env.example`, ConfigModule validation) | Done |
| Logging (nestjs-pino) | Done |
| Swagger (`/docs`, health documented) | Done |
| GitHub Actions (`.github/workflows/ci.yml`) | Done |
| Testing (Vitest: shared-kernel, api, env validation; Prisma validate) | Done |

## Intentionally excluded

- All domain/business modules (members, billing, auth, CMS, …)
- Applying feature migrations beyond schema package (existing Neon migrations from prior work remain; M0 does not add new business DDL)

## Verify

```bash
pnpm install
pnpm docker:up          # optional local Postgres + Redis
pnpm lint
pnpm format:check
pnpm build
pnpm test
```

API (with `.env` present):

- `GET /v1/health`
- Swagger UI: `/docs`

## Review gate

Approve Milestone 0 before any business-module milestone.
