# Milestone 2 — Tenancy + Identity (completion report)

**Status:** Approved (2026-08-05)  
**Depends on:** Milestone 1 (Approved)  

## Exit criteria

| Criterion | Status |
|---|---|
| Tenant resolution via verified Host **or** `X-Organization-Slug` | Done |
| JWT access tokens (short-lived) | Done |
| Opaque refresh tokens with HMAC hash storage + rotation + reuse detection | Done |
| Login / logout / refresh | Done |
| Email verification request + confirm | Done |
| Password reset request + confirm | Done |
| Argon2id password hashing | Done |
| Prisma models: `User`, `RefreshToken`, `PasswordResetToken`, `EmailVerificationToken` | Used as designed |
| DDD modules (`tenancy`, `identity`) | Done |
| Swagger docs for auth routes | Done (`/docs`) |
| Domain + use-case tests | Done (tenancy resolve; login / refresh rotate+reuse / logout; password-reset request) |
| Documentation | Done (this file) |
| `pnpm lint` / `pnpm build` / `pnpm test` green | Required on review |

## HTTP surface (`/v1/auth`)

| Method | Path | Tenant | Auth |
|---|---|---|---|
| POST | `/login` | required | — |
| POST | `/refresh` | — | refresh body/cookie |
| POST | `/logout` | — | refresh body/cookie |
| POST | `/password-reset/request` | required | — |
| POST | `/password-reset/confirm` | — | reset token |
| POST | `/email-verification/request` | required | Bearer access |
| POST | `/email-verification/confirm` | — | verify token |
| GET | `/me` | — | Bearer access |

Local/dev: send header `X-Organization-Slug: <slug>` (Host domain mapping is for verified `organization_domains`).

### Refresh cookie

Login and refresh set httpOnly cookie `refresh_token`:

| Attribute | Value |
|---|---|
| `httpOnly` | `true` |
| `path` | `/v1/auth` |
| `sameSite` | `lax` |
| `secure` | `true` when `NODE_ENV=production` |
| `maxAge` | `JWT_REFRESH_TTL_SECONDS` |

Clients may also send the raw refresh token in the request body. Logout clears the cookie and revokes the token when present.

## Security notes

- Passwords: Argon2id  
- Refresh tokens: random opaque values; only HMAC-SHA256(`JWT_REFRESH_SECRET`, token) stored  
- Refresh reuse of a rotated token revokes the entire token family  
- Login unknown-email and bad-password both return `INVALID_CREDENTIALS` (no account enumeration)  
- Password-reset request always returns `{ ok: true }` even when the user is unknown  
- Password-reset and email-verification tokens stored as SHA-256 hashes  
- Email sender is a console/log adapter until the Comms milestone  

## Env additions

```bash
JWT_ACCESS_SECRET=...   # min 16 chars
JWT_REFRESH_SECRET=...  # min 16 chars
JWT_ACCESS_TTL_SECONDS=900
JWT_REFRESH_TTL_SECONDS=2592000
APP_PUBLIC_URL=http://localhost:4321
# Optional — comma-separated origins for credentialed CORS; unset → localhost portal/web defaults
# CORS_ORIGINS=https://app.example.com,https://www.example.com
```

## Harden pass (this review gate)

- Tenancy: unit tests for slug/host normalize, missing org, suspended org  
- Identity: unknown-email login, refresh happy-path rotate, logout, password-reset enumeration-safe path  
- `CORS_ORIGINS` documented in `.env.example` and validated via `AppEnv`; bootstrap reads it from `ConfigService`  

## How to verify

```bash
pnpm install
pnpm lint
pnpm build
pnpm test
```

Swagger: start API (`pnpm --filter @association/api dev`) → `http://localhost:3000/docs`

## What was intentionally not built

- Platform operator auth / org provisioning → **M3**  
- RBAC permission checks on business routes → **M3b**  
- Member registration / invites UI → later members milestone  
- Real transactional email (SES/Resend) → Comms (**M9**)  
- MFA → Phase 2  

## Review checklist

- [x] Endpoints match table above in Swagger  
- [x] Login fails for wrong password / unknown email without leaking whether email exists  
- [x] Refresh rotation + reuse detection covered by unit tests  
- [x] No org-hardcoded branding or logic  
- [x] `pnpm lint` / `pnpm build` / `pnpm test` green — verified on harden pass  
- [x] Approve M2 → authorize **Milestone 3** (Platform Admin) only  

**Approved** 2026-08-05 — Milestone 3 waits for explicit go-ahead.
