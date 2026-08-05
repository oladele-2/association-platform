# Milestone 3 — Platform Admin + Tenancy provisioning (completion report)

**Status:** Approved (2026-08-05)  
**Depends on:** Milestone 2 (Approved)  
**Scope (confirmed):** Platform Admin + orgs / domains / features / branding + tenant resolution.  
**Deferred to M3b:** Tenant RBAC permission catalog + admin APIs (provision already seeds system roles via existing seed use case).

## Exit criteria

| Criterion | Status |
|---|---|
| Platform operator auth (`platform_users`, JWT `typ=platform_access`) | Done |
| One-time bootstrap (secret-gated) | Done (timing-safe compare; min 16 chars when set) |
| Provision organization + trial subscription + default feature flags + branding row | Done |
| Domains attach + verify (token or force) | Done |
| Feature flag upsert/list | Done |
| Branding upsert/get | Done |
| Public tenant resolve (`GET /v1/tenancy/resolve`) with branding + features | Done |
| Tenant Host/slug resolution with 60s cache; suspend blocks access | Done |
| Swagger | Done (`/docs`) |
| Domain + use-case tests | Done (bootstrap/login, org lifecycle/domains/features, JWT typ isolation, live operator re-check on guard) |
| Documentation | Done (this file + SECURITY.md auth notes) |
| `pnpm lint` / `pnpm build` / `pnpm test` green | Required on review |

## HTTP surface

### Platform auth (`/v1/platform/auth`)

| Method | Path | Auth |
|---|---|---|
| POST | `/bootstrap` | `PLATFORM_BOOTSTRAP_SECRET` (only when zero platform users) |
| POST | `/login` | — |
| GET | `/me` | Platform Bearer |

### Organizations (`/v1/platform/organizations`) — Platform Bearer required

| Method | Path |
|---|---|
| GET/POST | `/` |
| GET/PATCH | `/:id` |
| POST | `/:id/activate` |
| GET/POST | `/:id/domains` |
| POST | `/:id/domains/:domainId/verify` |
| GET/POST | `/:id/features` |
| GET/PATCH | `/:id/branding` |

### Tenancy

| Method | Path | Notes |
|---|---|---|
| GET | `/v1/tenancy/resolve` | Header `X-Organization-Slug` or verified Host; returns org + branding + features |

## Bootstrap (first run)

```bash
# .env — omit PLATFORM_BOOTSTRAP_SECRET after first successful bootstrap
PLATFORM_BOOTSTRAP_SECRET=...   # min 16 characters

curl -X POST http://localhost:3000/v1/platform/auth/bootstrap \
  -H 'content-type: application/json' \
  -d '{"bootstrapSecret":"...","email":"ops@example.com","name":"Ops","password":"change-me-now-12"}'
```

Then `POST /v1/platform/auth/login` → use Bearer for org APIs.

## Harden pass (this review gate)

- Timing-safe bootstrap secret comparison; env min-length when secret is set  
- `PlatformJwtGuard` reloads the operator and rejects disabled accounts before each protected call  
- Unit tests: bootstrap / login / org activate-suspend-domains-features / JWT `typ` isolation (tenant ↛ platform and reverse)  
- SECURITY.md documents shared `JWT_ACCESS_SECRET` + `typ` separation  

## What was intentionally not built

- Tenant RBAC admin APIs / permission catalog depth → **M3b**  
- Platform user management CRUD beyond bootstrap  
- Plans admin UI APIs beyond ensure-on-provision  
- Logo/favicon file upload → **M4 Files**  
- Domain DNS auto-check automation  
- Redis-backed tenant cache (in-memory TTL for now)  
- Fine-grained platform permissions (any active platform JWT is operator for M3)  

## Review checklist

- [x] Platform JWT cannot call tenant `/v1/auth/me` (token `typ` differs) — covered by unit isolation test  
- [x] Provision creates features + branding + trialing subscription  
- [x] Verified domain Host resolves; unverified does not (lookup requires `verifiedAt`)  
- [x] Suspended org blocked by tenant resolution  
- [x] No org-hardcoded branding logic  
- [x] `pnpm lint` / `pnpm build` / `pnpm test` green — verified on harden pass  
- [x] Approve M3 → authorize **Milestone 3b** (Tenant RBAC) only  

**Approved** 2026-08-05 — Milestone 3b waits for explicit go-ahead.
