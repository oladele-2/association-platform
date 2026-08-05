# Cursor Rules

This project uses **Cursor project rules** under [`.cursor/rules/`](./.cursor/rules/). Those `.mdc` files are what Cursor loads automatically.

| Rule file | Scope |
|---|---|
| [`.cursor/rules/enterprise-saas.mdc`](./.cursor/rules/enterprise-saas.mdc) | Always apply — SaaS, DDD, tenancy, security |
| [`.cursor/rules/ddd-nestjs.mdc`](./.cursor/rules/ddd-nestjs.mdc) | `apps/api/**` — layer boundaries |

Human-readable standards also live in [`CODING_STANDARDS.md`](./CODING_STANDARDS.md), [`ARCHITECTURE.md`](./ARCHITECTURE.md), and [`SECURITY.md`](./SECURITY.md).

## Instructions enforced for agents

1. This project is an **enterprise SaaS** platform.  
2. Always prioritize **maintainability** over speed.  
3. Never duplicate business logic.  
4. Follow **Domain-Driven Design**.  
5. Keep **controllers thin**.  
6. Business rules belong in **domain / application** services.  
7. **Repositories** only access persistence.  
8. Every module must be **independently testable**.  
9. Never **hardcode** organization-specific values.  
10. Everything must support **multi-tenancy**.  
11. Never bypass **authorization**.  
12. Prefer **composition** over inheritance.  
13. Generate **production-ready** code.  
14. Do **not** generate placeholder implementations unless explicitly requested.  
15. When uncertain, **explain the trade-offs** before coding.  

To change agent behaviour, edit the `.mdc` files in `.cursor/rules/` (not only this document).
