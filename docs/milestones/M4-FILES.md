# Milestone 4 — Files API (completion report)

**Status:** Approved (2026-08-05)  
**Depends on:** M3b Tenant RBAC (Approved)  
**Scope:** Signed upload/download behind `ObjectStorage` port. Mock when R2 env unset (dev/CI); Cloudflare R2 when configured.

## Exit criteria

| Criterion | Status |
|---|---|
| `ObjectStorage` port + mock / R2 adapters | Done |
| MIME + size allowlists per purpose | Done |
| Signed upload / confirm / download / soft-delete | Done |
| Member photograph helpers (`/me/photograph/*`) | Done |
| Tenant isolation (`organizationId` + RLS) | Done |
| Within-tenant authz (uploader vs purpose managers) | Done (this harden) |
| Purpose checks on attach consumers | Done (billing evidence, CME, profile photo) |
| Env fail-closed for partial R2 / prod mock | Done |
| Tests | Done |
| Docs | Done (this file) |
| `pnpm lint` / `pnpm build` / `pnpm test` green | Required on review |

## Module

| Path | Responsibility |
|---|---|
| `apps/api/src/modules/files` | File metadata + signed URLs |

## Storage

| Driver | When |
|---|---|
| `mock` | Default when R2 unset (dev/CI). Production requires full `R2_*` **or** explicit `ALLOW_MOCK_STORAGE=true`. Partial R2 env is rejected at boot. |
| `r2` | When `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` are all set |

Object keys: `orgs/{organizationId}/{purpose}/{year}/{fileId}-{safeFilename}`  
Purpose is derived from the key path (and returned on `FileView.purpose`).

## HTTP surface

| Path | Auth / notes |
|---|---|
| `POST /v1/files/upload-url` | Tenant JWT; `cms`/`event`/`branding` require manage permissions; sensitive purposes forced `private` |
| `POST /v1/files/:id/confirm` | Uploader only; size must match declared; optional SHA-256 hex checksum |
| `GET /v1/files/:id/download-url` | Ready files; public = any tenant user; private = uploader or purpose manager |
| `DELETE /v1/files/:id` | Soft-delete; uploader or purpose manager |
| `POST /v1/me/photograph/upload-url` | Forces `member_photo` + private |
| `POST /v1/me/photograph/confirm` | `{ fileId }` then PATCH `/me/profile` |

### Upload body

`{ originalFilename, mimeType, sizeBytes, visibility?, purpose? }`

Purposes: `member_photo`, `payment_evidence`, `receipt`, `cms`, `cme`, `event`, `branding`, `other`.

### Purpose → elevate permission

| Purpose | Upload gate | Manage (download/delete others’) |
|---|---|---|
| `cms` | `cms.publish` | `cms.publish` |
| `event` | `events.manage` | `events.manage` |
| `branding` | `org.settings` | `org.settings` |
| `payment_evidence` / `receipt` | authenticated | `payments.verify` |
| `cme` | authenticated | `cme.review` |
| `member_photo` | authenticated | `members.write` |
| `other` | authenticated | `org.settings` |

## Wired consumers

- Billing manual / remittance evidence: ready + purpose `payment_evidence`
- CME submit: ready + purpose `cme`
- `PATCH /me/profile` (`photographFileId`): ready + purpose `member_photo`

## Harden pass (this review gate)

- Within-tenant access control (no “any JWT downloads any private file”)  
- Purpose mismatch rejected at attach points  
- Confirm: checksum format, incomplete upload size, MIME charset normalize  
- Branding: drop `image/svg+xml` (XSS on public CDN)  
- Env: partial R2 rejected; production mock requires `ALLOW_MOCK_STORAGE`  

## Intentionally deferred

- Orphan GC / physical R2 delete  
- Virus scanning  
- MinIO local emulator (ADR mentioned; mock covers CI — MinIO optional later)  
- CMS/CME/event UI attach helpers beyond `fileId` validation  
- Streaming bytes through Nest  

## Verify

```bash
pnpm lint && pnpm build && pnpm test
```

Env: `.env.example` (`R2_*`, `ALLOW_MOCK_STORAGE`)  
Swagger: `/docs`

## Review checklist

- [x] Signed upload/confirm/download behind ObjectStorage (mock + R2)  
- [x] Within-tenant authz (uploader vs purpose managers)  
- [x] Purpose checks on billing / CME / profile attach  
- [x] Partial R2 and production mock fail-closed  
- [x] `pnpm lint` / `pnpm build` / `pnpm test` green — verified on harden pass  
- [x] Approve M4 → authorize **Milestone 5** (Members + Institutions) only  

**Approved** 2026-08-05 — Milestone 5 waits for explicit go-ahead.
