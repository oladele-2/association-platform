# Milestone 5 — Members + Institutions API (completion report)

**Status:** Approved (2026-08-05)  
**Depends on:** M4 Files (Approved)  
**Scope:** API only (React portal / Flutter deferred to M8 / Phase 2).

## Exit criteria

| Criterion | Status |
|---|---|
| Membership types + members lifecycle + custom field definitions | Done |
| Me profile (+ photograph purpose check from M4) | Done |
| Institutions CRUD, admins, member links | Done |
| Institution portal (`/institutions/mine`, `:id`, members) | Done — table admin **+** scoped permissions |
| Assign institution admin grants scoped `institution_admin` RBAC | Done |
| No org-specific branding flags in API names | Done (`isNetworkAffiliate`; column map retains legacy DB name) |
| Tests | Done |
| Docs | Done (this file) |
| `pnpm lint` / `pnpm build` / `pnpm test` green | Required on review |

## Modules

| Module | Path | Responsibility |
|---|---|---|
| Members | `apps/api/src/modules/members` | Membership types, members lifecycle, custom fields, me profile |
| Institutions | `apps/api/src/modules/institutions` | Institutions CRUD, admins, member links, institution-scoped portal |

## HTTP surface

### Admin (tenant JWT + org-level permissions)

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
| `GET/PATCH /v1/institutions/:id` | `institution_admins` + `institutions.read\|write` with **institution scope** |
| `GET /v1/institutions/:id/members` | Same + `institution.members.manage` (scoped) |

Portal PATCH accepts profile fields only (name, address, phone, email, state, lga) — not status/type.

## Domain notes

- Member statuses: `draft` → `active` (activate) → `suspended` / soft-delete `archived`
- Creating a member without `membershipTypeId` seeds/uses org default `STANDARD` type
- Primary institution link flips `members.primary_institution_id` when `isPrimary=true`; unlink of a primary link clears it
- `isNetworkAffiliate` (DB column `is_agpmpn_member`) is a generic affiliate/network flag — no association-specific API naming
- System role `institution_admin` includes `institutions.read|write` + `institution.members.manage` (assign admin creates scoped RBAC assignment)

## Harden pass (this review gate)

- Portal authz uses `AuthorizationService` + `requiredScope` (fixes scoped-grant vs org-level guard clash)  
- Assign/revoke institution admin keeps RBAC scope in sync  
- Rename affiliate flag; clear primary on unlink  
- Expanded lifecycle + portal permission tests  

## Intentionally deferred

- `POST .../members/:id/invite` (needs email/outbox + identity invite flow)
- Bulk remittance resolve (Billing M6)
- React portal shells (M8), Flutter (Phase 2)
- Custom field *values* CRUD on member (definitions only in this milestone)
- Audit log rows for activate/exemption (auditing module later)

## Verify

```bash
pnpm lint && pnpm build && pnpm test
```

Swagger: `/docs`

## Review checklist

- [x] Members lifecycle + membership types + field definitions  
- [x] Institution portal uses scoped `AuthorizationService` checks  
- [x] Assign/revoke institution admin syncs scoped RBAC  
- [x] No org-specific API naming for affiliate flag (`isNetworkAffiliate`)  
- [x] `pnpm lint` / `pnpm build` / `pnpm test` green — verified on harden pass  
- [x] Approve M5 → authorize **Milestone 6** (Billing) only  

**Approved** 2026-08-05 — Milestone 6 waits for explicit go-ahead.
