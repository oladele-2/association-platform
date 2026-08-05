# Milestone 2 — Tenancy + Identity (completion report)

**Status:** Complete — awaiting review  
**Depends on:** Milestone 1  

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
| Domain + use-case tests | Done |
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

Refresh token is also set as httpOnly cookie `refresh_token` on path `/v1/auth`.

## Security notes

- Passwords: Argon2id  
- Refresh tokens: random opaque values; only HMAC-SHA256(`JWT_REFRESH_SECRET`, token) stored  
- Refresh reuse of a rotated token revokes the entire token family  
- Password-reset and email-verification tokens stored as SHA-256 hashes  
- Email sender is a console/log adapter until the Comms milestone  

## Env additions

```bash
JWT_ACCESS_SECRET=...   # min 16 chars
JWT_REFRESH_SECRET=...  # min 16 chars
JWT_ACCESS_TTL_SECONDS=900
JWT_REFRESH_TTL_SECONDS=2592000
APP_PUBLIC_URL=http://localhost:4321
```

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
- RBAC permission checks on business routes → **M3**  
- Member registration / invites UI → later members milestone  
- Real transactional email (SES/Resend) → Comms (**M9**)  
- MFA → Phase 2  

## Review checklist

- [ ] Endpoints match table above in Swagger  
- [ ] Login fails for wrong password without leaking whether email exists  
- [ ] Refresh rotation + reuse detection covered by unit tests  
- [ ] No org-hardcoded branding or logic  
