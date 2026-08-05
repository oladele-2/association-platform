# Milestone 8 — Portal shells (completion report)

**Status:** Approved (2026-08-05)  
**Depends on:** M2 auth, M3b RBAC, M6 billing (dues), M7b public site CTA (`PUBLIC_PORTAL_URL`)  
**Domain note:** Production portal host is typically `app.<tenant-domain>`; local uses `VITE_ORG_SLUG`.

## Exit criteria

| Criterion | Status |
|---|---|
| Vite + React app in `apps/portal` (`@association/portal`) | Done |
| Login / refresh / logout against `/v1/auth/*` (httpOnly refresh cookie) | Done |
| Tenant resolve (slug or Host) + branding CSS variables | Done |
| Member, institution, admin shells with spec nav | Done |
| Admin shell + nav filtered by **permissions** (not role names) | Done |
| Shell switcher when multiple entitlements | Done |
| Placeholder pages for remaining feature routes | Done |
| Password reset + email verify aux screens + forced gates | Done |
| `returnUrl` sanitized (same-app relative paths only) | Done |
| API CORS for local portal origins | Done |
| Unit tests (`deriveShells`, `safeReturnUrl`, money format) | Done |
| `pnpm --filter @association/portal build/lint/test` | Done |

## How to verify

```bash
# terminal 1
pnpm --filter @association/api dev

# terminal 2
pnpm --filter @association/portal install
# Local: set VITE_ORG_SLUG (see .env.example)
pnpm --filter @association/portal dev   # http://localhost:5173
```

Vite proxies `/v1` → `http://localhost:3000`. On production portal hosts, omit `VITE_ORG_SLUG` so tenancy resolves via Host.

## Scope boundaries (this slice)

- Shells + auth + first live screens:
  - Member **My Profile** (`GET/PATCH /v1/me/profile`)
  - Member **Dues & Payments** (list invoices/payments + Paystack initialize)
  - Admin **Members** list (`GET /v1/admin/members` with search/status)
- Remaining nav items stay placeholders
- Institution shell appears when `GET /v1/institutions/mine` returns rows
- Admin shell appears when the user holds at least one administrative **permission**

## Hardening notes

- Refresh tokens are **not** stored in `sessionStorage` (cookie + Vite proxy / credentials)
- Proactive access-token refresh before expiry; 401 → single refresh+retry
- Offline branding fallback is generic (“Association Portal”), never org-specific

## Intentionally deferred

- Institution live remittance/affiliation screens
- Full admin editors (finance, CMS, roles, …)
- Feature-flag-driven nav from tenant `features`

## Key paths

| Path | Role |
|---|---|
| `apps/portal/src/lib/auth.tsx` | Session + cookie refresh |
| `apps/portal/src/lib/tenant.tsx` | Public tenancy bootstrap |
| `apps/portal/src/lib/shells.ts` | Nav maps + permission entitlements |
| `apps/portal/src/lib/api.ts` | Client, org slug, returnUrl sanitizer |
| `apps/portal/src/App.tsx` | Routes |
| `apps/api/src/main.ts` | CORS for portal/web local origins |

## Approval gate

- [x] Approve M8 → authorize **Milestone 9** only when explicitly requested
