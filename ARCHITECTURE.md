# Architecture

High-level technical architecture for the Association Management Platform. Deep dives live under [`docs/`](./docs/) and ADRs under [`docs/adr/`](./docs/adr/).

## Style

- **Modular monolith** (NestJS API), not microservices  
- **DDD + Clean Architecture** inside each bounded context  
- **Multi-tenant SaaS** with shared PostgreSQL schema + Row Level Security  

## System context

```text
  Astro Web ──┐
  React Portal ├── Cloudflare (DNS, SSL, CDN, WAF) ──► NestJS API (DigitalOcean)
  Flutter* ───┘                                              │
  Platform UI ───────────────────────────────────────────────┤
                                                             ├── PostgreSQL (+ RLS)
                                                             ├── Redis (queues, cache)
                                                             └── R2 (objects)
  Paystack webhooks ─────────────────────────────────────────► API
  Email provider / FCM ◄─── BullMQ workers ──────────────────┘

  * Flutter = Phase 2
```

## Stack (accepted)

| Layer | Choice |
|---|---|
| API | Node.js, NestJS, TypeScript |
| ORM | Prisma (+ raw SQL for RLS / partial indexes) |
| DB | PostgreSQL 16+ on **Neon** (pooled + direct URLs) |
| Queue / cache | Redis + BullMQ |
| Public web | Astro on Cloudflare Pages |
| Portals | React + TypeScript |
| Storage | Cloudflare R2 |
| Auth | JWT access + rotating refresh tokens |
| Payments | Paystack + manual evidence |
| Mobile | Flutter (Phase 2) |
| Hosting | DigitalOcean (API/workers), Cloudflare (edge) |

## Tenancy

See [ADR 0001](./docs/adr/0001-multi-tenancy.md).

- Every tenant table includes `organization_id`  
- `Host` → `organization_domains` → org context  
- `SET LOCAL app.organization_id` per request transaction + FORCE RLS  
- Flat orgs in v1 (no parent/child FK hierarchy)  

## DDD layering (mandatory)

Per Nest bounded context module:

```text
presentation/     → controllers: validate + authorize + delegate
application/      → use cases / application services
domain/           → entities, VOs, domain services, events, repository ports
infrastructure/   → Prisma repos, Paystack, R2, email, queue adapters
```

Rules:

- No business rules in controllers  
- No Prisma in presentation or domain  
- Cross-context sync via application facades; async via domain events + outbox  
- Modules independently testable (domain tests with no Nest/DB)  

## Major bounded contexts

Platform · Tenancy · Identity · RBAC · Members · Institutions · Billing · CMS · CME · Events · Files · Comms · Notifications · Audit · Cooperative (stub until Phase 3)

## Frontends

| App | Role |
|---|---|
| `apps/web` | Public tenant website |
| `apps/portal` | Member + institution + org admin (role shells) |
| `apps/platform` | Ajir Platform Operator (separate auth domain) |
| `mobile/` | Flutter client against same OpenAPI (Phase 2) |

## Key ADRs

| ADR | Decision |
|---|---|
| [0001](./docs/adr/0001-multi-tenancy.md) | Shared schema + RLS |
| [0002](./docs/adr/0002-prisma.md) | Prisma + SQL companions |
| [0003](./docs/adr/0003-r2-storage.md) | R2 object storage |
| [0004](./docs/adr/0004-paystack.md) | Paystack + manual payments |
| [0005](./docs/adr/0005-rbac.md) | Permission-based RBAC |

## Further reading

- [docs/database/DATABASE_ARCHITECTURE.md](./docs/database/DATABASE_ARCHITECTURE.md)  
- [docs/specs/FUNCTIONAL_SPECIFICATION.md](./docs/specs/FUNCTIONAL_SPECIFICATION.md)  
- [CODING_STANDARDS.md](./CODING_STANDARDS.md)  
- [SECURITY.md](./SECURITY.md)  
