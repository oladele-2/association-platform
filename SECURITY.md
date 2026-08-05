# Security

Security is a first-class requirement for a multi-tenant platform that holds member PII and payment data.

## Threat themes

| Theme | Approach |
|---|---|
| Cross-tenant data leak | `organization_id` + FORCE Row Level Security; app still filters by org |
| Credential theft | Argon2id hashes; short-lived JWT; rotating refresh tokens; revoke on reuse |
| Payment fraud / replay | Paystack signature verification; idempotent webhooks; unique references |
| File abuse | Allowlisted MIME/size; private objects via signed URLs only |
| Privilege abuse | Permission-based RBAC; audit log on money and admin actions |
| Secret leakage | Env/vault only; never commit keys |

## Authentication

- Access JWT (~15m): thin claims (`sub`, `org_id`, roles/permissions summary as needed)  
- Refresh: opaque hashed tokens, family rotation, reuse detection → revoke family  
- Portal: HttpOnly Secure SameSite refresh cookie  
- Mobile (later): secure storage for refresh  
- Password reset / email verify: single-use, short TTL  

See Identity milestone work and Functional Spec §7.

## Authorization

- Check **permissions**, not role display names ([ADR 0005](./docs/adr/0005-rbac.md))  
- Institution/committee actions require resource scope checks  
- Platform Operator auth is separate from tenant auth  

## Multi-tenancy

- Resolve tenant from verified Host mapping only  
- `SET LOCAL` tenant GUC inside the request transaction (no cross-request pool bleed)  
- Prefer `404` over leaking cross-tenant existence where appropriate  

[ADR 0001](./docs/adr/0001-multi-tenancy.md)

## Payments

- Never trust client-reported “paid” status without gateway verification or admin verify path  
- Store amounts as integer kobo  
- Manual evidence: treasurer verify/reject with audit trail  

[ADR 0004](./docs/adr/0004-paystack.md)

## Files

- Bytes in R2; metadata in PostgreSQL ([ADR 0003](./docs/adr/0003-r2-storage.md))  
- CME, payment evidence, passports, receipts = private by default  

## Data protection (NDPR-oriented)

- Collect only what the association needs  
- Distinguish transactional vs marketing email consent  
- Plan for export/delete tooling (may land after Phase 1 MVP)  
- Soft-delete where product requires recovery; financial ledgers use status transitions, not silent deletes  

## Operational security

- Cloudflare WAF / bot protection on public edges  
- Rate-limit auth and public contact forms (Redis)  
- Dependency and image scanning in CI (as CI is introduced)  
- Least-privilege DB roles: migrator vs app vs readonly  
- Production backups and tested restore ([database architecture](./docs/database/DATABASE_ARCHITECTURE.md))  

## Reporting

If you discover a vulnerability in this codebase or a deployed tenant, do **not** open a public issue with exploit detail. Contact the maintainers privately (Ajir engineering) with reproduction steps.

## Related

- [ARCHITECTURE.md](./ARCHITECTURE.md)  
- [CODING_STANDARDS.md](./CODING_STANDARDS.md)  
- [docs/adr/](./docs/adr/)  
