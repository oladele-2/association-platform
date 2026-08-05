# Milestone M11 — FCM device tokens + push fan-out (completion report)

**Status:** Approved (2026-08-05)  
**Depends on:** M9/M9b Comms, F1 Flutter  
**Scope:** Register/revoke FCM tokens; fail-closed push provider; fan-out on CME notifications; Flutter registers token after login when FCM is enabled.

## Product rules

| Rule | Choice |
|---|---|
| Push when Firebase unset | Mock only with `ALLOW_MOCK_PUSH=true`; production fail-closed (same pattern as email) |
| Flutter | `firebase_messaging` register after login when `ENABLE_FCM=true` |
| Tenant isolation | Token rows scoped by `organization_id` + `user_id`; RLS already on `device_tokens` |
| Token reuse | Rebind via platform delete+create (same physical device, new session) |

## Exit criteria

| Criterion | Status |
|---|---|
| `POST /v1/me/device-tokens` + `POST .../revoke` | Done |
| PushProvider port + mock/fcm adapters | Done |
| Env: `PUSH_DRIVER`, `ALLOW_MOCK_PUSH`, Firebase SA | Done |
| CME approve/reject fans out push | Done |
| Invalid FCM tokens revoked | Done |
| Flutter token register (gated by `ENABLE_FCM`) | Done |
| Tests + docs | Done |
| `pnpm lint` / `build` / `test` (+ flutter) | Done (2026-08-05) |

## Surfaces

| Surface | Path |
|---|---|
| API | `POST /v1/me/device-tokens`, `POST /v1/me/device-tokens/revoke` |
| Push | `MockPushProvider` \| `FcmPushProvider` (HTTP v1) |
| Flutter | `push_registration.dart` after login/bootstrap; revoke on logout |

## Notes

- Android needs `google-services.json` (see example) for real FCM; Gradle plugin applies only when that file exists.
- Windows builds that use FlutterFire may need Developer Mode for plugin symlinks (documented in `mobile/README.md`).

## Approval gate

- [x] Approve M11 → authorize next milestone only when explicitly requested
