# Milestone F1 — Flutter member companion shell (completion report)

**Status:** Complete — awaiting review  
**Phase:** Phase 2 start (docs originally deferred Flutter after portal; started early by request)  
**Depends on:** M2 auth, M3 tenancy resolve, member APIs from M5/M6

## Exit criteria

| Criterion | Status |
|---|---|
| Flutter app at `mobile/` (Architecture.md layout) | Done — Dart sources + pubspec |
| Login against `POST /v1/auth/login` | Done |
| Refresh / access token persistence (`TokenStore` file; secure-storage later) | Done |
| Tenant resolve / offline branding fallback | Done |
| Member shell with Home / ID / Dues / CME / Alerts nav | Done (placeholders after Home) |
| Outside pnpm/turbo (Flutter SDK compile) | Done |
| `flutter analyze` / `flutter test` | Requires Flutter SDK on PATH |

## How to verify

Flutter SDK was bootstrapped locally at `%USERPROFILE%\flutter` for this machine (add `bin` to PATH).

```bash
set PATH=%USERPROFILE%\flutter\bin;%PATH%
cd mobile
flutter pub get
flutter analyze
flutter test
flutter run -d windows
# Android emulator API host default: http://10.0.2.2:3000
# Desktop: flutter run --dart-define=API_BASE_URL=http://127.0.0.1:3000
```

Dart defines:

- `API_BASE_URL` (default `http://10.0.2.2:3000`)
- `ORG_SLUG` (default `nma-ogun`)

Verified this slice: `flutter analyze` clean; `flutter test` passed.

## Scope boundaries

- Member companion: auth + Home shell
- Live: **Profile**, **Dues**, **CME** (list + submit with existing `fileId`), **Notifications** (list + mark read)
- CME evidence upload still uses Files API (paste ready `fileId`; full mobile upload later)
- Push/FCM still deferred
- Not part of `pnpm build`

## Key paths

| Path | Role |
|---|---|
| `mobile/lib/main.dart` | App entry + theme |
| `mobile/lib/auth/auth_state.dart` | Session + secure storage |
| `mobile/lib/api/api_client.dart` | HTTP + org slug header |
| `mobile/lib/screens/` | Login + member shell |
