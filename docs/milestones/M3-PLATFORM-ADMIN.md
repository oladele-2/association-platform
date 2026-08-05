# Milestone 3 — Platform Admin + Tenancy provisioning (completion report)

**Status:** Complete — awaiting review  
**Depends on:** Milestone 2  
**Scope (confirmed):** Platform Admin + orgs / domains / features / branding + tenant resolution.  
**Deferred:** Tenant RBAC permission catalog + role seeding (follow-up).

## Exit criteria

| Criterion | Status |
|---|---|
| Platform operator auth (`platform_users`, JWT `typ=platform_access`) | Done |
| One-time bootstrap (secret-gated) | Done |
| Provision organization + trial subscription + default feature flags + branding row | Done |
| Domains attach + verify (token or force) | Done |
| Feature flag upsert/list | Done |
| Branding upsert/get | Done |
| Public tenant resolve (`GET /v1/tenancy/resolve`) with branding + features | Done |
| Tenant Host/slug resolution with 60s cache; suspend blocks access | Done |
| Swagger | Done (`/docs`) |
| Domain + use-case tests | Done |
| Documentation | Done (this file) |
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
# .env
PLATFORM_BOOTSTRAP_SECRET=...

curl -X POST http://localhost:3000/v1/platform/auth/bootstrap \
  -H 'content-type: application/json' \
  -d '{"bootstrapSecret":"...","email":"ops@example.com","name":"Ops","password":"change-me-now-12"}'
```

Then `POST /v1/platform/auth/login` → use Bearer for org APIs.

## What was intentionally not built

- Tenant RBAC permission seed / default org roles → follow-up  
- Platform user management CRUD beyond bootstrap  
- Plans admin UI APIs beyond ensure-on-provision  
- Logo/favicon file upload → **M4 Files**  
- Domain DNS auto-check automation  
- Redis-backed tenant cache (in-memory TTL for now)  

## Review checklist

- [ ] Platform JWT cannot call tenant `/v1/auth/me` (token `typ` differs)  
- [ ] Provision creates features + branding + trialing subscription  
- [ ] Verified domain Host resolves; unverified does not  
- [ ] Suspended org blocked by tenant resolution  
- [ ] No org-hardcoded branding logic  
