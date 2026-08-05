# Milestone P1 — Platform Operator console (completion report)

**Status:** Complete — awaiting review  
**Depends on:** M3 Platform Admin APIs  
**App:** `apps/platform` (`@association/platform`) on port **5174**

## Exit criteria

| Criterion | Status |
|---|---|
| Vite + React operator console | Done |
| Platform login (`POST /v1/platform/auth/login`) + `/me` restore | Done |
| Organizations list | Done |
| Provision form → create org | Done |
| Org detail: activate, domains list/add/**force-verify**, features list, **branding editor** | Done |
| Plans / platform users / health placeholders | Done |
| API CORS includes `:5174` | Done |
| `pnpm --filter @association/platform build/lint/test` | Required on review |

## How to verify

```bash
# bootstrap once (if no platform users):
# POST /v1/platform/auth/bootstrap { bootstrapSecret, email, password }

pnpm --filter @association/api dev
pnpm --filter @association/platform install
pnpm --filter @association/platform dev   # http://localhost:5174
```

## Scope boundaries

- Branding editor: primary/secondary colors + email from fields
- Domain force-verify for operators
- No plans/subscriptions API UI yet (not implemented in API)
- No platform user admin beyond bootstrap
- Access JWT only (no platform refresh token)

## Key paths

| Path | Role |
|---|---|
| `apps/platform/src/lib/auth.tsx` | Operator session |
| `apps/platform/src/pages/OrganizationsPage.tsx` | Org list |
| `apps/platform/src/pages/ProvisionPage.tsx` | Provision |
| `apps/platform/src/pages/OrganizationDetailPage.tsx` | Detail / domains |
