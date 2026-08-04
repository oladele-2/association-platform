# Association Management Platform

Multi-tenant Association Management Platform (Ajir).  
Architecture, database, and functional specs live under [`docs/`](./docs/).

## Milestone-based development

See [`docs/MILESTONES.md`](./docs/MILESTONES.md). Implement one milestone at a time; each must compile, pass tests, and be reviewed before the next.

**Current:** Milestone 1 — Foundation (monorepo, shared kernel, database package).

## Prerequisites

- Node.js 22+ (20+ may work)
- pnpm 9+
- PostgreSQL 16+ (required from Milestone 2 for migrations)

## Quick start (Milestone 1)

```bash
pnpm install
pnpm build
pnpm test
```

## Workspace layout

```
apps/
  api/       NestJS API (DDD modular monolith)
  web/       Astro public site (stub until CMS milestone)
  portal/    React tenant portal (stub)
  platform/  React Platform Operator console (stub)
packages/
  database/      Prisma schema + client
  shared-kernel/ Domain primitives (OrganizationId, Money, Result, DomainEvent)
  shared/        Cross-app constants / Zod (grows later)
  typescript-config/
  eslint-config/
docs/
  database/
  specs/
```

## License

Proprietary — Ajir / Association Platform.
