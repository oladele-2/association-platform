# Contributing

Thank you for contributing to the Association Management Platform. Read this before opening a PR.

## Before you code

1. Read [PROJECT_VISION.md](./PROJECT_VISION.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).  
2. Follow [CODING_STANDARDS.md](./CODING_STANDARDS.md) and [SECURITY.md](./SECURITY.md).  
3. Work against the current milestone in [ROADMAP.md](./ROADMAP.md) / [docs/MILESTONES.md](./docs/MILESTONES.md).  
4. Do not start the next milestone until the previous one is reviewed and approved.  

## Setup

```bash
git clone https://github.com/oladele-2/association-platform.git
cd association-platform
pnpm install
cp .env.example .env   # fill values as milestones require
pnpm build
pnpm test
```

From Milestone 2 onward you will also need Docker (PostgreSQL + Redis).

## Branching

- `main` — protected integration branch  
- Feature branches: `m2/rls-migrations`, `feat/members-activate`, `fix/...`  
- Prefer rebase on latest `main` before PR  

## Commits

- Imperative mood, concise subject focused on **why**  
- Example: `Add RLS policies for tenant isolation`  
- Do not commit `.env`, credentials, or generated secrets  

## Pull requests

Every PR should:

- [ ] Target the active milestone scope only  
- [ ] Pass `pnpm build` and `pnpm test`  
- [ ] Include tests for new domain/application behaviour  
- [ ] Avoid tenant-hardcoded branding (no “NMA Ogun” in app code)  
- [ ] Update docs/ADRs if a decision changed  
- [ ] Keep controllers thin (DDD)  

PR description should link Functional Spec sections or screen IDs when implementing user-facing behaviour.

## Code ownership expectations

- Domain changes require domain tests  
- Schema changes require updates to `docs/database/` and Prisma schema together  
- Payment, auth, and RLS changes require extra security review attention ([SECURITY.md](./SECURITY.md))  

## Questions

Architecture questions → ADRs + Architecture doc.  
Product behaviour → Functional Specification.  
Delivery order → Roadmap / Milestones.  
