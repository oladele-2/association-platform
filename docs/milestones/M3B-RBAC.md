# Milestone 3b — Tenant RBAC (completion report)

**Status:** Approved (2026-08-05)  
**Depends on:** M3 Platform Admin (Approved)  
**Scope:** Permission catalog, system role templates on provision, admin role APIs, `@RequirePermissions` guard, authorization service, tests.

## Exit criteria

| Criterion | Status |
|---|---|
| Global permission catalog (Functional Spec §16 keys) | Done — seeded on API boot |
| System role templates per org on provision | Done |
| Platform re-seed `POST /v1/platform/organizations/:id/seed-roles` | Done |
| Admin roles/permissions/assignment APIs | Done |
| `PermissionsGuard` + `@RequirePermissions` | Done |
| `AuthorizationService` (union of role permissions + optional scope) | Done — scoped grants do **not** escalate to org-level checks |
| `GET /v1/me/permissions` | Done |
| Tests | Done (policy scope matrix, system-role locks, assign scope, PermissionsGuard, revoke user binding) |
| Docs | Done (this file) |
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
| DELETE | `/v1/admin/users/:userId/roles/:assignmentId` | `roles.manage` (assignment must belong to `:userId`) |
| POST | `/v1/platform/organizations/:id/seed-roles` | platform JWT |

All tenant admin routes require `X-Organization-Slug` (or verified Host) + tenant Bearer JWT.

## Scope semantics

- **Org-wide assignment** (`scopeType` null / `organization`): grants satisfy org-level `@RequirePermissions` and any later scoped check for the same key.
- **Institution/committee assignment**: satisfies only when the use case/guard supplies a matching `requiredScope`. `PermissionsGuard` currently performs **org-level** checks (no request scope) — institution-admin routes must call `AuthorizationService` with scope in application code (M5+).
- Scoped grants **must not** pass org-level checks (fixed on this harden pass).

## Harden pass (this review gate)

- Authorization policy: no scoped→org escalation  
- Revoke binds `organizationId` + `userId` + `assignmentId`  
- Prisma repo re-checks `isSystem` on permission replace / rename / delete  
- Tests: guard 403, system locks, template ⊆ catalog, scope matrix  

## Usage in future modules

```typescript
@UseGuards(TenantGuard, AccessJwtGuard, PermissionsGuard)
@RequirePermissions('payments.verify')
@Post('admin/payments/:id/verify')
verify() { /* ... */ }
```

Institution-scoped example (application layer):

```typescript
await authz.assertPermissions({
  organizationId,
  userId,
  permissionKeys: ['institution.members.manage'],
  scope: { scopeType: 'institution', scopeId },
});
```

## Intentionally deferred

- MFA for finance permissions  
- RLS on `role_permissions` / `permissions` tables  
- Auto-assign `org_admin` to first invited tenant user (needs invite flow)  
- Platform-role permission checks beyond JWT presence  
- Validating `scopeId` exists as institution/committee row (needs M5 entities on assign)  
- Portal shell entitlement via permissions not role-key heuristics → **M8**  

## Review checklist

- [x] Catalog matches Functional Spec §16  
- [x] System roles locked from permission edits/deletes  
- [x] Guard returns 403 without required permission  
- [x] Provision seeds roles without org-hardcoded labels  
- [x] Scoped grants do not satisfy org-level permission checks  
- [x] `pnpm lint` / `pnpm build` / `pnpm test` green — verified on harden pass  
- [x] Approve M3b → authorize **Milestone 4** (Files) only  

**Approved** 2026-08-05 — Milestone 4 waits for explicit go-ahead.
