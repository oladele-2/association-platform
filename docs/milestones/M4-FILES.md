# Milestone — Files API (completion report)

**Status:** Complete — awaiting review  
**Scope:** Signed upload/download behind `ObjectStorage` port. Mock when R2 env unset; Cloudflare R2 when configured.

## Module

| Path | Responsibility |
|---|---|
| `apps/api/src/modules/files` | File metadata + signed URLs |

## Storage

| Driver | When |
|---|---|
| `mock` | Default (dev/CI) — confirm succeeds without real PUT |
| `r2` | When `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` set |

Object keys: `orgs/{organizationId}/{purpose}/{year}/{fileId}-{safeFilename}`

## HTTP surface

| Path | Auth |
|---|---|
| `POST /v1/files/upload-url` | Tenant JWT |
| `POST /v1/files/:id/confirm` | Uploader |
| `GET /v1/files/:id/download-url` | Tenant JWT (`ready` only) |
| `DELETE /v1/files/:id` | Soft-delete |
| `POST /v1/me/photograph/upload-url` | Forces `member_photo` + private |
| `POST /v1/me/photograph/confirm` | `{ fileId }` then PATCH `/me/profile` |

### Upload body

`{ originalFilename, mimeType, sizeBytes, visibility?, purpose? }`

Purposes: `member_photo`, `payment_evidence`, `receipt`, `cms`, `cme`, `event`, `branding`, `other` (MIME + size allowlists).

## Wired consumers

- Billing manual / remittance evidence: `fileId` must be **ready** (validated via `GetReadyFileUseCase`)

## Intentionally deferred

- Orphan GC / physical R2 delete  
- Virus scanning  
- CMS/CME/event attach helpers (APIs ready; modules can pass `fileId`)  
- Streaming bytes through Nest  

## Verify

```bash
pnpm lint && pnpm build && pnpm test
```

Env (optional): `R2_*` from `.env.example`  
Swagger: `/docs`
