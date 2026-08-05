# Milestone M9b — Event registration + SMTP email drain (completion report)

**Status:** Approved (2026-08-05)  
**Depends on:** M9 CME+Comms, M7a Events CRUD  
**Scope:** Member/admin event registration; fail-closed SMTP; async delivery drain.  
**Deferred:** FCM / `device_tokens`, scheduled campaigns (`scheduledAt`), BullMQ (Interval drain for now).

## Exit criteria

| Criterion | Status |
|---|---|
| `GET /v1/me/events` with registration state | Done |
| `POST/DELETE /v1/me/events/:id/registrations` (window + capacity + unique) | Done |
| Admin `GET .../registrations`, `PATCH` status | Done |
| Domain rules + use-case tests | Done |
| `SMTP_*` + `ALLOW_MOCK_EMAIL` fail-closed in production | Done |
| `EMAIL_PROVIDER` mock \| smtp; identity transactional email same driver | Done |
| Queue creates deliveries + returns `sending` (no inline send) | Done |
| Interval drain claims → send → finalize campaign | Done |
| Delivery `sending` status (migration) | Done |
| FCM / scheduled campaigns | Deferred |
| Docs | Done (this file) |
| `pnpm lint` / `pnpm build` / `pnpm test` | Done |

## HTTP

| Path | Auth |
|---|---|
| `GET /v1/me/events` | Member JWT |
| `POST /v1/me/events/:id/registrations` | Member JWT |
| `DELETE /v1/me/events/:id/registrations` | Member JWT |
| `GET /v1/admin/events/:id/registrations` | `events.read` |
| `PATCH /v1/admin/events/:id/registrations/:registrationId` | `events.manage` |
| `POST /v1/admin/email-campaigns/:id/queue` | Enqueues deliveries; drain sends |

## Env

- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM`
- `ALLOW_MOCK_EMAIL=true` required in production without SMTP
- `EMAIL_DRAIN_INTERVAL_MS` (default `5000`; `0` disables)

## Approval gate

- [x] Approve M9b → authorize next milestone only when explicitly requested
