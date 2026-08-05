# Milestone 3b — Tenant RBAC (completion report)

**Status:** Complete — awaiting review  
**Depends on:** M3 Platform Admin  
**Scope:** Permission catalog, system role templates on provision, admin role APIs, `@RequirePermissions` guard, authorization service, tests.

## Exit criteria

| Criterion | Status |
|---|---|
| Global permission catalog (Functional Spec §16 keys) | Done — seeded on API boot |
| System role templates per org on provision | Done |
| Platform re-seed `POST /v1/platform/organizations/:id/seed-roles` | Done |
| Admin roles/permissions/assignment APIs | Done |
| `PermissionsGuard` + `@RequirePermissions` | Done |
| `AuthorizationService` (union of role permissions + optional scope) | Done |
| `GET /v1/me/permissions` | Done |
| Tests | Done |
| Docs | Done |
| `pnpm lint` / `pnpm build` / `pnpm test` green | Required on review |

## Permission keys (catalog)

`members.read|write`, `institutions.read|write`, `institution.members.manage`, `payments.read|verify`, `reports.finance`, `cme.read|review`, `events.read|manage`, `cms.read|publish`, `comms.campaign`, `roles.manage`, `org.settings`, `audit.read`

## System roles

`org_admin` (all), `treasurer`, `financial_secretary`, `secretariat`, `institution_admin`, `member` (empty — authenticated shell only)

## HTTP surface

| Method | Path | Permission |
|---|---|---|
| GET | `/v1/me/permissions` | authenticated |
| GET | `/v1/admin/permissions` | `roles.manage` |
| GET/POST | `/v1/admin/roles` | `roles.manage` |
| PUT | `/v1/admin/roles/:roleId/permissions` | `roles.manage` |
| PATCH/DELETE | `/v1/admin/roles/:roleId` | `roles.manage` |
| GET/POST | `/v1/admin/users/:userId/roles` | `roles.manage` |
| DELETE | `/v1/admin/users/:userId/roles/:assignmentId` | `roles.manage` |
| POST | `/v1/platform/organizations/:id/seed-roles` | platform JWT |

All tenant admin routes require `X-Organization-Slug` (or verified Host) + tenant Bearer JWT.

## Usage in future modules

```typescript
@UseGuards(TenantGuard, AccessJwtGuard, PermissionsGuard)
@RequirePermissions('payments.verify')
@Post('admin/payments/:id/verify')
verify() { /* ... */ }
```

## Intentionally deferred

- MFA for finance permissions  
- RLS on `role_permissions` / `permissions` tables  
- Auto-assign `org_admin` to first invited tenant user (needs invite flow)  
- Platform-role permission checks beyond JWT presence  

## Review checklist

- [ ] Catalog matches Functional Spec §16  
- [ ] System roles locked from permission edits/deletes  
- [ ] Guard returns 403 without required permission  
- [ ] Provision seeds roles without org-hardcoded labels  
