# Association member companion (Flutter)

Phase 2 mobile shell against the same OpenAPI as the portal.

## Configure

Release builds **require**:

```bash
flutter run --release \
  --dart-define=API_BASE_URL=https://api.example.com \
  --dart-define=ORG_SLUG=your-org-slug
```

Debug defaults (emulator → host API): `http://10.0.2.2:3000` and slug `demo`. Override with the same defines. Desktop local API example:

```bash
flutter run -d windows \
  --dart-define=API_BASE_URL=http://127.0.0.1:3000 \
  --dart-define=ORG_SLUG=demo
```

`ALLOW_INSECURE_API=true` may be used only for controlled non-HTTPS exceptions in release.

### Push (FCM)

Default is **off**. To register a device token after login:

1. Place Firebase `android/app/google-services.json` (see `google-services.json.example`).
2. Run with `--dart-define=ENABLE_FCM=true`.

API must have `FIREBASE_*` credentials (or `ALLOW_MOCK_PUSH=true` in non-prod).

## Verify

```bash
cd mobile
flutter pub get
flutter analyze
flutter test
```

## Security notes

- **Windows:** refresh/access tokens use Windows Credential Manager (`CredWrite` / `CredRead`).
- **Other platforms:** app-dir vault file (`session.vault.json`); migrate to Keystore/Keychain before store release.
- Legacy plaintext `session.json` is migrated once then deleted.
- Mid-session 401 triggers single-flight refresh + one retry.
- Account gates (`mustResetPassword`, unverified email) block the member shell.
- No Flutter plugins that require Windows Developer Mode / directory symlinks.

## Deferred

- Digital membership ID screen (needs API)
- On-device CME evidence upload / photograph
- Store release signing (do not ship debug-signed APKs)
