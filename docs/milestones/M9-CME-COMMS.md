# Milestone — CME + Communications API (completion report)

**Status:** Complete — awaiting review  
**Scope:** CME submit/review + email templates/campaigns with **mock** email provider + in-app notifications. Event registration & real SMTP/FCM deferred.

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

Approve/reject writes `domain_event_outbox` + in-app `notifications`.

## Comms HTTP

| Path | Permission / auth |
|---|---|
| `GET/PUT /v1/admin/email-templates` | `comms.campaign` |
| `GET/POST /v1/admin/email-campaigns`, `GET .../:id` | `comms.campaign` |
| `POST .../email-campaigns/:id/queue` | Resolves audience → deliveries → **mock send** |
| `GET /v1/me/notifications`, `POST .../:id/read`, `POST .../read-all` | Member/staff JWT |

Audience filter JSON: `{ membershipStatus?, institutionId?, membershipTypeId? }` (defaults to active members with linked users).

## Intentionally deferred

- Real email provider (Resend/SMTP)  
- Async worker / scheduled campaigns  
- FCM push tokens  
- Event registration APIs (already have Events CRUD from M7a)  

## Verify

```bash
pnpm lint && pnpm build && pnpm test
```

Swagger: `/docs`
