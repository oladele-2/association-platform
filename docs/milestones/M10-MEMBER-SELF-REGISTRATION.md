# Milestone M10 — Public member self-registration (completion report)

**Status:** Approved (2026-08-05)  
**Depends on:** M5 Members, M2 Identity, M7b Web, M8 Portal, F1 Mobile  
**Scope:** Doctors register on public website (multi-step), portal, and Android; congratulate + CTA to portal/app; admins retain edit/delete.

## Product rules (approved)

| Rule | Choice |
|---|---|
| Membership after signup | **Active immediately** (admin can still edit/delete) |
| Form richness | Name, email, password, phone, DOB, sex, membership type, institution, **public** custom fields |
| Bot protection (v1) | Honeypot + in-process rate limit (Turnstile later) |
| Post-signup UX | Website thank-you + portal welcome gate + Android welcome |

## Exit criteria

| Criterion | Status |
|---|---|
| `GET /v1/public/registration` catalog (types, institutions, public fields) | Done |
| `POST /v1/public/registration` creates User + Member (active) | Done |
| Honeypot reject + rate limit | Done |
| Multi-step website form + thank-you CTAs | Done |
| Portal register + welcome gate | Done |
| Android register + welcome gate | Done |
| Admin edit/delete unchanged (`members.write`) | Done (existing) |
| Multi-tenant (no org hardcoding in API) | Done |
| Tests + docs | Done |
| `pnpm lint` / `build` / `test` (+ flutter analyze/test) | Done (2026-08-05) |

## Surfaces

| Surface | Path |
|---|---|
| API | `GET`/`POST /v1/public/registration` |
| Website | `/register` multi-step + thank-you |
| Portal | `/register` + member `WelcomeBanner` after sign-in |
| Android | Register from login + welcome card on Home |

## Approval gate

- [x] Approve M10 → authorize next milestone only when explicitly requested
