# Association Management Platform

Multi-tenant **Association Management Platform** by Ajir.

| Doc | Purpose |
|---|---|
| [PROJECT_VISION.md](./PROJECT_VISION.md) | Why we build this |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System shape, stack, DDD |
| [CODING_STANDARDS.md](./CODING_STANDARDS.md) | Coding rules |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Setup and PRs |
| [SECURITY.md](./SECURITY.md) | Security posture |
| [ROADMAP.md](./ROADMAP.md) | Milestones |
| [CURSOR_RULES.md](./CURSOR_RULES.md) | AI agent rules |
| [docs/](./docs/) | Specs, ADRs, milestone reports |

## Current status

**Milestone 0 (Foundation)** — complete, awaiting review.  
See [docs/milestones/M0-FOUNDATION.md](./docs/milestones/M0-FOUNDATION.md).

```bash
pnpm install
pnpm docker:up    # Postgres + Redis locally
pnpm lint
pnpm build
pnpm test
```

## Prerequisites

- Node.js 20+ (22 recommended)
- pnpm 9+
- Docker (for local Postgres/Redis)
- Optional: Neon `DATABASE_URL` / `DATABASE_URL_UNPOOLED` in `.env`

## Workspace

```text
apps/api|web|portal|platform
packages/database|shared-kernel|shared|typescript-config|eslint-config
docs/
.github/workflows/ci.yml
docker-compose.yml
```

## License

Proprietary — Ajir / Association Platform.
