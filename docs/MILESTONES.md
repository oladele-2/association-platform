# Development milestones

Each milestone must **compile**, **pass its tests**, include **documentation**, and receive **review/approval** before the next begins.

| ID | Name | Exit criteria |
|---|---|---|
| **M0** | Foundation | pnpm + Turborepo monorepo; root docs + ADRs + Cursor rules; `shared-kernel` with unit tests; `packages/database` Prisma schema validates against Neon; Nest API builds with `/v1/health`; `pnpm build && pnpm test` green |
| **M1** | Database runtime | Prisma migrate baseline + RLS/partial-index SQL on Neon; Redis via Docker Compose; connectivity/RLS smoke tests |
| **M2** | Tenancy + Identity | Host→org resolution; JWT/refresh; login/logout; Argon2; email verify + password reset; DDD identity/tenancy modules; Swagger |
| **M3** | Platform Admin | Platform auth; provision orgs/domains/features/branding; public tenant resolve |
| **M3b** | Tenant RBAC | Permission catalog; system roles on provision; admin APIs; `@RequirePermissions` guard |
| **M4** | Files | R2 (or MinIO) signed upload/download behind ports |
| **M5** | Members + Institutions | Member/institution bounded contexts per functional spec |
| **M6** | Billing | Fee schedules, invoices, Paystack + manual evidence |
| **M7** | CMS + Web | Content admin APIs + Astro public site |
| **M7a** | CMS / Events / Committees API | Admin + public content, events, committees APIs |
| **M7b** | Astro public website | Branded NMA Ogun demo site; config-driven; public API + demo fallback |
| **M8** | Portal shells | Member / institution / admin React portal |
| **M9** | CME + Events depth + Comms | CME, event registration, email queue + FCM stubs |
| **F1** | Flutter member shell | Phase 2 companion: auth + member live screens |
| **P1** | Platform Operator console | Login, org list, provision, org detail |

## Milestone status

| Milestone | Status | Report |
|---|---|---|
| M0 | Approved | [M0-FOUNDATION.md](./milestones/M0-FOUNDATION.md) |
| M1 | Complete — awaiting review | [M1-DATABASE-RUNTIME.md](./milestones/M1-DATABASE-RUNTIME.md) |
| M2 | Complete — awaiting review | [M2-TENANCY-IDENTITY.md](./milestones/M2-TENANCY-IDENTITY.md) |
| M3 | Complete — awaiting review | [M3-PLATFORM-ADMIN.md](./milestones/M3-PLATFORM-ADMIN.md) |
| M3b | Complete — awaiting review | [M3B-RBAC.md](./milestones/M3B-RBAC.md) |
| M4 | Complete — awaiting review | [M4-FILES.md](./milestones/M4-FILES.md) |
| M5 | Complete — awaiting review | [M5-MEMBERS-INSTITUTIONS.md](./milestones/M5-MEMBERS-INSTITUTIONS.md) |
| M6 | Complete — awaiting review | [M6-BILLING.md](./milestones/M6-BILLING.md) |
| M7a | Complete — awaiting review | [M7-CMS-EVENTS-COMMITTEES-API.md](./milestones/M7-CMS-EVENTS-COMMITTEES-API.md) |
| M7b | Complete — awaiting review | [M7-WEB.md](./milestones/M7-WEB.md) |
| M8 | Complete — awaiting review | [M8-PORTAL.md](./milestones/M8-PORTAL.md) |
| M9 | Complete — awaiting review (CME + Comms slice) | [M9-CME-COMMS.md](./milestones/M9-CME-COMMS.md) |
| F1 | Complete — awaiting review | [F1-FLUTTER-SHELL.md](./milestones/F1-FLUTTER-SHELL.md) |
| P1 | Complete — awaiting review | [P1-PLATFORM-CONSOLE.md](./milestones/P1-PLATFORM-CONSOLE.md) |

```bash
pnpm install
pnpm docker:up   # optional local Redis
pnpm lint && pnpm build && pnpm test
```

**Do not start M4 until Milestone 3 / 3b are approved.**
