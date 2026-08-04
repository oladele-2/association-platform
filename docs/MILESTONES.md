# Development milestones

Each milestone must **compile**, **pass its tests**, and receive **review/approval** before the next begins.

| ID | Name | Exit criteria |
|---|---|---|
| **M1** | Foundation | pnpm workspace + Turborepo; `shared-kernel` with unit tests; `packages/database` Prisma schema validates; minimal Nest API builds; `pnpm build && pnpm test` green |
| **M2** | Database runtime | Docker Compose PG/Redis; migrate + RLS SQL; Prisma client generates against live DB; RLS smoke tests |
| **M3** | Tenancy + Identity | Host→org resolution; JWT/refresh; login/logout; Argon2; DDD modules for identity/tenancy |
| **M4** | Platform + RBAC | Provision org/domains/features; permissions/roles seed; platform auth |
| **M5** | Files | R2 (or local MinIO) signed upload/download behind ports |
| **M6** | Members + Institutions | Member/institution bounded contexts per functional spec |
| **M7** | Billing | Fee schedules, invoices, Paystack + manual evidence |
| **M8** | CMS + Web | Content admin APIs + Astro public site |
| **M9** | Portal shells | Member / institution / admin React portal |
| **M10** | CME + Events + Comms | Remaining Phase 1 modules |

## Milestone 1 status

**Complete — ready for review.**

Verify locally:

```bash
pnpm install
pnpm build
pnpm test
```

Exit criteria met: Turborepo monorepo; `@association/shared-kernel` (7 tests); `@association/database` Prisma schema validates & client generates; Nest `@association/api` builds with health endpoint; stubs for web/portal/platform.

**Do not start Milestone 2 until Milestone 1 is reviewed/approved.**

