# Milestone 7b — Astro public website (completion report)

**Status:** Approved (2026-08-05)  
**Depends on:** M7a (public content/events/committees + contact APIs)  
**Next (confirmed):** M8 React member/admin portal

## Exit criteria

| Criterion | Status |
|---|---|
| Astro static site in `apps/web` | Done |
| Demo branding via `src/config/tenant.ts` (chrome uses `shortName` / `displayName`) | Done |
| Theme CSS variables driven from tenant colors | Done |
| Demo CMS fallback gated by `PUBLIC_USE_DEMO_FALLBACK` | Done |
| Gallery + downloads from public CMS (empty state when none) | Done |
| Contact form honest errors (no fake success) | Done |
| Routes: Home, About, Executives, Past executives, Committees, News, Events, Gallery, Downloads, Contact | Done |
| `pnpm --filter @association/web build` / lint / test | Done |

## How to verify

```bash
pnpm --filter @association/web lint
pnpm --filter @association/web build
# Local demo content when API empty:
# PUBLIC_USE_DEMO_FALLBACK=true pnpm --filter @association/web dev
```

Production / CI builds should omit `PUBLIC_USE_DEMO_FALLBACK` so demo copy is not baked when the API is empty.

Optional: start API on `:3000` with org slug from `PUBLIC_ORG_SLUG`; set org branding `emailFromAddress` for contact delivery.

## Notes for reviewers

- NMA Ogun remains the **demo tenant config defaults**, not hardcoding in UI chrome.
- Executive photographs / file URLs may still use tenant image placeholders until public file URLs are wired.
- Scheduled publish and gallery multi-asset APIs remain deferred (M7a).

## Key paths

| Path | Role |
|---|---|
| `apps/web/src/config/tenant.ts` | Demo tenant branding + fallback flag |
| `apps/web/src/lib/api.ts` | Public API + gated demo fallback |
| `apps/web/src/pages/` | Route pages |
| `apps/web/public/images/` | Branch photography + crest |

## Approval gate

- [x] Approve M7b (with M7a as M7) → authorize M8 only when explicitly requested
