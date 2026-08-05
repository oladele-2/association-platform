# Milestone 7a — CMS / Events / Committees API (completion report)

**Status:** Approved (2026-08-05)  
**Depends on:** M6 Billing (Approved)  
**Scope:** API — Pages, News, Downloads, Gallery, Executives, Events, Committees + public contact.

## Exit criteria

| Criterion | Status |
|---|---|
| CMS content CRUD + publish/unpublish | Done |
| Events CRUD + publish/cancel + speakers | Done |
| Committees CRUD + roster | Done |
| Public published-only content/events | Done |
| JWT org must match Host/slug tenant (fail closed) | Done |
| File / member / content FK validation on writes | Done |
| `POST /v1/public/contact` (branding inbox via email sender) | Done |
| Admin content `status` filter validated | Done |
| Tests for publish gates, contact, committeee FK | Done |
| Docs | Done (this file) |
| `pnpm lint` / `pnpm build` / `pnpm test` green | Done |

## Modules

| Module | Path |
|---|---|
| CMS | `apps/api/src/modules/cms` |
| Events | `apps/api/src/modules/events` |
| Committees | `apps/api/src/modules/committees` |

## HTTP surface

### Admin (tenant JWT + permissions; org match enforced)

| Path | Permission |
|---|---|
| `/v1/admin/content` CRUD + publish/unpublish | `cms.read` / `cms.publish` |
| `/v1/admin/events` CRUD + publish/cancel + speakers | `events.read` / `events.manage` |
| `/v1/admin/committees` CRUD + members | `cms.read` / `cms.publish` |

### Public (Host / `X-Organization-Slug`)

| Path |
|---|
| `GET /v1/public/content?type=` |
| `GET /v1/public/content/by-slug?type=&slug=` |
| `GET /v1/public/events`, `GET /v1/public/events/:slug` |
| `GET /v1/public/committees`, `GET /v1/public/committees/:slug` |
| `POST /v1/public/contact` |

## Intentionally deferred

- Scheduled auto-publish job (`scheduled` status remains schema-ready)  
- Gallery `content_assets` multi-file API  
- Event registration (M9)  
- Website revalidation webhooks / outbox audit on publish  
- Astro site (M7b)

## Approval gate

- [x] Approve M7a (with M7b as M7) → authorize M8 only when explicitly requested
