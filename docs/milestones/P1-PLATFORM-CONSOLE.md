# Milestone P1 — Platform Operator console (completion report)

**Status:** Approved (2026-08-05)  
**Depends on:** M3 Platform Admin APIs  
**App:** `apps/platform` (`@association/platform`) on port **5174**

## Exit criteria

| Criterion | Status |
|---|---|
| Vite + React operator console | Done |
| Platform login + `/me` restore (normalized userId/id) | Done |
| Organizations list | Done |
| Provision form → create org (editable geo/currency) | Done |
| Org detail: activate, domains + verification token, force-verify via `verifiedAt`, feature toggles, branding, subscription readout | Done |
| `safeReturnUrl` + 401 session clear | Done |
| Generic placeholders (no org branding hardcodes) | Done |
| Plans / platform users / health placeholders | Done |
| API CORS includes `:5174` | Done |
| Vitest (`safeReturnUrl`, `/me` normalize, domain verify) | Done |
| Docs | Done (this file) |
| `pnpm lint` / `pnpm build` / `pnpm test` | Done |

## How to verify

```bash
# bootstrap once (if no platform users):
# POST /v1/platform/auth/bootstrap { bootstrapSecret, email, password }

pnpm --filter @association/api dev
pnpm --filter @association/platform dev   # http://localhost:5174
pnpm --filter @association/platform lint
pnpm --filter @association/platform build
pnpm --filter @association/platform test
```

## Scope boundaries

- Branding editor: primary/secondary colors + email from fields (neutral UI defaults)
- Domain force-verify for operators; DNS token surfaced after add
- Feature enable/disable via existing `POST .../features`
- No plans/subscriptions management UI beyond detail readout
- No platform user admin beyond bootstrap
- Access JWT in sessionStorage (interim); **platform refresh cookie deferred** (align with portal later)
- Fine-grained platform permissions deferred (any active platform JWT is operator)

## Key paths

| Path | Role |
|---|---|
| `apps/platform/src/lib/auth.tsx` | Operator session |
| `apps/platform/src/lib/api.ts` | Fetch + `safeReturnUrl` + 401 hook |
| `apps/platform/src/pages/OrganizationsPage.tsx` | Org list |
| `apps/platform/src/pages/ProvisionPage.tsx` | Provision |
| `apps/platform/src/pages/OrganizationDetailPage.tsx` | Detail / domains / features / branding |

## Approval gate

- [x] Approve P1 → authorize next milestone only when explicitly requested
