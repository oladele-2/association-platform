# Milestone — CMS / Events / Committees API (completion report)

**Status:** Complete — awaiting review  
**Scope:** API only (Astro public site deferred). Covers Pages, News, Downloads, Gallery, Executives, Events, Committees.

## Modules

| Module | Path | Responsibility |
|---|---|---|
| CMS | `apps/api/src/modules/cms` | `content_items` CRUD + publish |
| Events | `apps/api/src/modules/events` | Events + speakers |
| Committees | `apps/api/src/modules/committees` | Committees + member roster |

## Content types (`ContentType`)

`page`, `news`, `blog`, `circular`, `download`, `gallery_album`, `executive`, `past_executive`  
(Executives use `attributes` for role_title / photo metadata until Files milestone.)

## HTTP surface

### Admin (tenant JWT + permissions)

| Path | Permission |
|---|---|
| `/v1/admin/content` CRUD + `/:id/publish` + `/:id/unpublish` | `cms.read` / `cms.publish` |
| `/v1/admin/events` CRUD + publish/cancel + speakers | `events.read` / `events.manage` |
| `/v1/admin/committees` CRUD + members | `cms.read` / `cms.publish` |

### Public (tenant Host / `X-Organization-Slug`)

| Path |
|---|
| `GET /v1/public/content?type=` |
| `GET /v1/public/content/by-slug?type=&slug=` |
| `GET /v1/public/events`, `GET /v1/public/events/:slug` |
| `GET /v1/public/committees`, `GET /v1/public/committees/:slug` |

## Intentionally deferred

- Astro website (Milestone Web)  
- File upload URLs for covers/gallery assets (Files / R2)  
- Event registration (needs Members)  
- Website revalidation webhooks on publish  

## Verify

```bash
pnpm lint && pnpm build && pnpm test
```

Swagger: `/docs`
