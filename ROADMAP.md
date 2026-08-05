# Roadmap

Delivery is **milestone-based**: each milestone must compile, pass tests, include docs, and be reviewed before the next starts. Detail: [docs/MILESTONES.md](./docs/MILESTONES.md).

## Phases

### Phase 0 — Foundation (Milestone 0)

Monorepo (pnpm + Turborepo), shared kernel, Prisma schema package (Neon), Nest health API, product docs, ADRs, Cursor rules.

**Status:** Approved.

### Phase 1 — First-tenant MVP (Milestones 1–9)

| Milestone | Focus | Status |
|---|---|---|
| M1 | Neon migrations + RLS; Redis Compose | Complete — awaiting review |
| M2 | Tenancy resolution + Identity (JWT/refresh) | Complete — awaiting review |
| M3 | Platform Operator + org provision (domains/features/branding) | Complete — awaiting review |
| M3b | Tenant RBAC (permissions, roles, guards) | Complete — awaiting review |
| M4 | Files port + R2/MinIO | Not started |
| M5 | Members + Institutions | Not started |
| M6 | Billing (Paystack + manual evidence + receipts) | Not started |
| M7 | CMS APIs + Astro public website | Partial — **M7a API done**; Astro not started |
| M8 | React portal shells (member / institution / admin) | Not started |
| M9 | CME + Comms (registration/FCM deferred) | Approved — see [docs/milestones/M9-CME-COMMS.md](./docs/milestones/M9-CME-COMMS.md) |

### Phase 2 — Depth + Mobile

- Flutter app against frozen OpenAPI  
- Richer events (attendance), imports, MFA for finance roles  
- Public member QR verify polish, advanced reports  

### Phase 3 — Cooperative + SaaS maturity

- Cooperative Society module (savings, loans, guarantors)  
- Automated Ajir subscription billing to associations  
- Optional org hierarchy / federation if required  

## Explicitly deferred

- Elections  
- National→branch hierarchy in schema v1  
- Microservices / Kubernetes until ops pain demands it  
- Soft-coding any single association into the application  

## How to track progress

1. Check current milestone in [docs/MILESTONES.md](./docs/MILESTONES.md)  
2. Implement only that milestone’s exit criteria  
3. `pnpm build && pnpm test`  
4. Review / approve → start next milestone  
