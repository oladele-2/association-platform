# Coding Standards

These standards apply to all application code in this repository. Prefer clarity and long-term maintainability over speed of generation.

## Principles

1. Follow **DDD + Clean Architecture** as described in [ARCHITECTURE.md](./ARCHITECTURE.md).  
2. Keep business logic out of controllers.  
3. Controllers only validate requests and delegate to application use cases.  
4. Application services coordinate use cases; domain services hold business rules.  
5. Repositories (ports) own persistence abstractions; Prisma lives in infrastructure.  
6. Every module must be independently testable.  
7. Do not duplicate business rules across modules — share via facades, events, or shared kernel.  
8. Design for reuse across organisations and future Ajir products.  
9. Prefer readability and explicitness over clever abstractions.  

## Language and style

- TypeScript **strict** mode  
- `snake_case` in the database; `camelCase` in TypeScript application code  
- Money: `bigint` minor units (kobo) — never `number` floats for currency  
- Prefer named use-case classes (`VerifyManualPayment`) over god-services (`BillingService` doing everything)  
- No NMA-specific (or other tenant-specific) strings in source; use seed/CMS/config  

## Module layout (Nest API)

```text
apps/api/src/modules/<context>/
  presentation/
  application/
  domain/
  infrastructure/
  <context>.module.ts
```

Dependency direction: `presentation → application → domain ← infrastructure`.

Enforce with lint/import restrictions as they are added (Milestone progression).

## Testing

| Layer | Allowed deps | Focus |
|---|---|---|
| Domain unit | None | Invariants, state machines, Money, policies |
| Application unit | Fake repos/ports | Use-case orchestration |
| Infrastructure integration | Docker PG/Redis | Prisma, RLS, adapters |
| HTTP e2e | Sparse | Critical paths only |

Every new domain rule should ship with at least one domain unit test.

## API conventions

- REST under `/v1`  
- OpenAPI as the contract for portal and future Flutter  
- Error envelope: `{ code, message, details? }`  
- Idempotency-Key on payment and bulk remittance mutations  
- Tenant from Host (not a free-form org id from the client body)  

## Git and reviews

- Milestone-based delivery: each milestone must build and pass tests before the next  
- Small PRs preferred; reference Functional Spec screen IDs where relevant  
- Do not commit secrets, `.env`, or real Paystack/R2 keys  

## Related

- [CONTRIBUTING.md](./CONTRIBUTING.md)  
- [SECURITY.md](./SECURITY.md)  
- [docs/adr/](./docs/adr/)  
