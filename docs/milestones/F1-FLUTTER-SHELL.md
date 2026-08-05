# Milestone F1 — Flutter member companion shell (completion report)

**Status:** Approved (2026-08-05)  
**Phase:** Phase 2 start  
**Depends on:** M2 auth, M3 tenancy resolve, member APIs from M5/M6/M9

## Exit criteria

| Criterion | Status |
|---|---|
| Flutter app at `mobile/` | Done |
| Login against `POST /v1/auth/login` | Done |
| Secure token persistence + migration from legacy file | Done (Windows Credential Manager; file vault elsewhere) |
| 401 single-flight refresh + retry | Done |
| Tenant resolve; offline uses **cached** branding (no org hardcode) | Done |
| Member shell: Home / Profile / Dues / CME / Alerts | Done (live `/v1/me/*`) |
| Forced reset / email-verify gates | Done |
| Release config requires HTTPS `API_BASE_URL` + `ORG_SLUG` | Done |
| Android main manifest `INTERNET` | Done |
| Currency-aware dues money format; open Paystack URL | Done |
| `pnpm lint` / `pnpm build` / `pnpm test` green | N/A (mobile outside turbo) — `flutter analyze` + `flutter test` Done |
| Docs | Done (this file + `mobile/README.md`) |

## How to verify

```bash
set PATH=%USERPROFILE%\flutter\bin;%PATH%
cd mobile
flutter pub get
flutter analyze
flutter test
# Desktop:
flutter run -d windows --dart-define=API_BASE_URL=http://127.0.0.1:3000 --dart-define=ORG_SLUG=<slug>
```

Dart defines:

- `API_BASE_URL` — required HTTPS in **release**; debug default `http://10.0.2.2:3000`
- `ORG_SLUG` — required in **release**; debug default `demo` (not a named tenant)

## Scope boundaries

- Member companion: auth + shell + Profile / Dues / CME / Notifications
- CME submit still pastes ready `fileId` (on-device upload later)
- Digital ID tab deferred until membership-card API
- Push/FCM deferred
- Android/iOS Keystore/Keychain (`flutter_secure_storage`) before store release
- Store signing keys deferred — do not ship debug-signed release APKs
- Not part of `pnpm build`

## Key paths

| Path | Role |
|---|---|
| `mobile/lib/main.dart` | Entry + account gates |
| `mobile/lib/auth/auth_state.dart` | Session, refresh, branding cache |
| `mobile/lib/auth/token_store.dart` | Secure storage |
| `mobile/lib/api/api_client.dart` | HTTP + org slug + 401 retry |
| `mobile/lib/screens/` | Login + shell tabs |

## Approval gate

- [x] Approve F1 → authorize next milestone only when explicitly requested
