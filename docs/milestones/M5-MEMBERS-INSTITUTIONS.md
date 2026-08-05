# Milestone — Members + Institutions API (completion report)

**Status:** Complete — awaiting review  
**Scope:** API only (React portal / Flutter deferred to M8 / Phase 2).

## Modules

| Module | Path | Responsibility |
|---|---|---|
| Members | `apps/api/src/modules/members` | Membership types, members lifecycle, custom fields, me profile |
| Institutions | `apps/api/src/modules/institutions` | Institutions CRUD, admins, member links, institution-scoped reads |

## HTTP surface

### Admin (tenant JWT + permissions)

| Path | Permission |
|---|---|
| `GET/POST /v1/admin/membership-types`, `PATCH .../:id` | `members.read` / `members.write` |
| `GET/POST /v1/admin/members`, `GET/PATCH/DELETE .../:id` | `members.read` / `members.write` |
| `POST /v1/admin/members/:id/activate\|suspend\|exemption` | `members.write` |
| `GET/POST /v1/admin/field-definitions`, `PATCH/DELETE .../:id` | `members.read` / `members.write` |
| `GET/POST /v1/admin/institutions`, `GET/PATCH/DELETE .../:id` | `institutions.read` / `institutions.write` |
| `GET/POST /v1/admin/institutions/:id/admins`, `DELETE .../admins/:adminId` | `institutions.write` |
| `GET .../:id/members` | `institutions.read` |
| `POST/PATCH/DELETE .../:id/members[/:linkId]` | `institution.members.manage` |

### Me / institution portal

| Path | Notes |
|---|---|
| `GET/PATCH /v1/me/profile` | Member row linked via `userId` |
| `GET /v1/institutions/mine` | Institutions where caller is institution admin |
| `GET/PATCH /v1/institutions/:id` | Requires `institution_admins` row + permission |
| `GET /v1/institutions/:id/members` | Same admin check + `institution.members.manage` |

## Domain notes

- Member statuses: `draft` → `active` (activate) → `suspended` / soft-delete `archived`
- Creating a member without `membershipTypeId` seeds/uses org default `STANDARD` type
- Primary institution link flips `members.primary_institution_id` when `isPrimary=true`
- Photograph / file assets deferred to Files (M4) — `photographFileId` accepted as UUID only

## Intentionally deferred

- `POST .../members/:id/invite` (needs email/outbox + identity invite flow)
- Bulk remittance resolve (Billing M6)
- React portal shells (M8), Flutter (Phase 2)
- Custom field *values* CRUD on member (definitions only in this milestone)

## Verify

```bash
pnpm lint && pnpm build && pnpm test
```

Swagger: `/docs`
