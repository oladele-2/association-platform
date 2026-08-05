# Milestone 9 — CME + Communications API (completion report)

**Status:** Approved (2026-08-05)  
**Depends on:** M5 Members, M4 Files (CME evidence), M3b RBAC  
**Scope:** CME submit/review + email templates/campaigns with **mock** email provider + in-app notifications.  
**Explicitly deferred (still M9 in index, not this slice):** event registration APIs, real SMTP/Resend, async worker, FCM device-token stubs.

## Exit criteria

| Criterion | Status |
|---|---|
| Member CME submit with ready `fileId` (purpose `cme`) | Done |
| Admin CME list + approve/reject with CAS + outbox/notifications | Done |
| Validated `creditHours` + `completedOn` | Done |
| Email templates + campaigns (`comms.campaign`) | Done |
| Campaign queue: draft CAS claim, audience allowlist, size cap, redacted mock logs | Done |
| Me notifications list/mark-read | Done |
| Secretariat template includes `cme.review` + `comms.campaign` | Done |
| Tests (domain + queue race / empty audience / reject) | Done |
| Docs | Done (this file) |
| `pnpm lint` / `pnpm build` / `pnpm test` green | Done |

## Modules

| Module | Path |
|---|---|
| CME | `apps/api/src/modules/cme` |
| Comms | `apps/api/src/modules/comms` |

## CME HTTP

| Path | Permission / auth |
|---|---|
| `GET/POST /v1/me/cme`, `GET /v1/me/cme/:id` | Member JWT (+ ready `fileId`) |
| `GET /v1/admin/cme`, `GET .../:id` | `cme.read` |
| `POST .../:id/approve\|reject` | `cme.review` |

Approve/reject writes `domain_event_outbox` + in-app `notifications` after a successful pending→reviewed CAS.

## Comms HTTP

| Path | Permission / auth |
|---|---|
| `GET/PUT /v1/admin/email-templates` | `comms.campaign` |
| `GET/POST /v1/admin/email-campaigns`, `GET .../:id` | `comms.campaign` |
| `POST .../email-campaigns/:id/queue` | Resolves audience → deliveries → **mock send** |
| `GET /v1/me/notifications`, `POST .../:id/read`, `POST .../read-all` | Member/staff JWT |

Audience filter JSON (allowlisted): `{ allActiveMembers?, membershipStatus?, institutionId?, membershipTypeId? }`  
Max recipients per queue: **5000**. Mock provider logs redacted emails.

## Intentionally deferred

- Real email provider (Resend/SMTP)  
- Async worker / scheduled campaigns  
- FCM push tokens / `device_tokens` APIs  
- Event registration APIs (Events CRUD remains from M7a)  

## Verify

```bash
pnpm lint && pnpm build && pnpm test
```

Swagger: `/docs`

## Approval gate

- [x] Approve M9 (CME + Comms slice) → authorize next milestone only when explicitly requested
