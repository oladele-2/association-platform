# Milestone 7b — Astro public website (completion report)

**Status:** Complete — awaiting review  
**Depends on:** M7a (public content/events/committees APIs)  
**Next (confirmed):** M8 React member/admin portal

## Exit criteria

| Criterion | Status |
|---|---|
| Astro static site in `apps/web` (`@association/web`) | Done |
| NMA Ogun demo branding via `src/config/tenant.ts` (not hardcoded in API) | Done |
| Full-bleed Doctors' House hero; brand-first home composition | Done |
| Routes: Home, About, Executives, Past executives, Committees, News, Events, Gallery, Downloads, Contact | Done |
| Public API client with demo fallback when API unreachable | Done |
| Assets from `pictures/` in `public/images/` | Done |
| Contact form soft-calls `POST /v1/public/contact` (stubs when offline) | Done |
| `pnpm --filter @association/web build` / lint / test | Required on review |

## How to verify

```bash
pnpm --filter @association/web install
pnpm --filter @association/web dev     # http://localhost:4321
pnpm --filter @association/web build
pnpm --filter @association/web lint
```

Optional: start API on `:3000` with org slug `nma-ogun` seeded — news/events/committees hydrate from `/v1/public/*`.

## Notes for reviewers

- Production public host for this tenant is **nmaogun.com.ng** (legacy Gateway landing may still live on .org.ng). This site implements the functional-spec public sitemap (W-01–W-14), not a pixel clone.
- Executive photographs are placeholders until CMS publishes content.
- Downloads are demo stubs until file-backed CMS items exist.
- Portal CTA points to `PUBLIC_PORTAL_URL` (default `http://localhost:5173`).

## Key paths

| Path | Role |
|---|---|
| `apps/web/src/config/tenant.ts` | Demo tenant branding |
| `apps/web/src/lib/api.ts` | Public API + demo fallback |
| `apps/web/src/pages/` | Route pages |
| `apps/web/public/images/` | Branch photography + crest |
