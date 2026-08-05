# Milestone 8 — Portal shells (completion report)

**Status:** Complete — awaiting review  
**Depends on:** M2 auth, M3b RBAC, M7b public site CTA (`PUBLIC_PORTAL_URL`)  
**Domain note:** NMA Ogun public host is **nmaogun.com.ng** (portal: `app.nmaogun.com.ng` in production)

## Exit criteria

| Criterion | Status |
|---|---|
| Vite + React app in `apps/portal` (`@association/portal`) | Done |
| Login / refresh / logout against `/v1/auth/*` | Done |
| Tenant resolve + branding CSS variables | Done |
| Member, institution, admin shells with spec nav | Done |
| Shell switcher when multiple entitlements | Done |
| Placeholder pages for remaining feature routes | Done |
| Password reset + email verify aux screens | Done |
| API CORS for local portal origins | Done |
| `pnpm --filter @association/portal build/lint/test` | Required on review |

## How to verify

```bash
# terminal 1
pnpm --filter @association/api dev

# terminal 2
pnpm --filter @association/portal install
pnpm --filter @association/portal dev   # http://localhost:5173
```

Vite proxies `/v1` → `http://localhost:3000`. Set `VITE_ORG_SLUG=nma-ogun` (default).

## Scope boundaries (this slice)

- Shells + auth + first live screens:
  - Member **My Profile** (`GET/PATCH /v1/me/profile`)
  - Member **Dues & Payments** (list invoices/payments + Paystack initialize)
  - Admin **Members** list (`GET /v1/admin/members` with search/status)
- Remaining nav items stay placeholders
- Institution shell appears when `GET /v1/institutions/mine` returns rows
- Admin shell appears when RBAC permissions/roles look administrative

## Key paths

| Path | Role |
|---|---|
| `apps/portal/src/lib/auth.tsx` | Session + refresh token storage |
| `apps/portal/src/lib/tenant.tsx` | Public tenancy bootstrap |
| `apps/portal/src/lib/shells.ts` | Nav maps + entitlement |
| `apps/portal/src/App.tsx` | Routes |
| `apps/api/src/main.ts` | CORS for portal/web local origins |
