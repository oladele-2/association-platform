# Project Vision

## Mission

Build a reusable, commercial **Association Management Platform** that digitizes the entire secretariat workflow of membership organisations — members, institutions, dues, communications, events, CME/CPD evidence, and public presence — without forking the codebase per customer.

## First customer, not the product

The first deployment target is the **Nigerian Medical Association (NMA) Ogun State Branch**.

That does **not** mean the software is “an NMA app.” Org name, branding, domains, membership categories, custom fields (e.g. MDCN number), and fee rules are **data**. Application code must remain usable for:

- NMA Lagos / other NMA branches  
- NMA National (later; flat tenants in v1)  
- NBA and other professional branches  
- NSE branches  
- Alumni associations  
- Medical societies  
- NGOs and general membership organisations  

Example hosts (configured per tenant):

- `nmaogun.com.ng` / `app.nmaogun.com.ng` / `api.nmaogun.com.ng`  
- later `nmalagos.org.ng` / `app.nmalagos.org.ng`  

## Product pillars

1. **Public website** — CMS-driven, SEO-oriented Astro site per tenant domain  
2. **Member portal** — profile, digital ID, dues (Paystack + evidence), CME, events, documents  
3. **Institution portal** — hospitals/clinics manage affiliated members and bulk remittances  
4. **Secretariat admin** — RBAC, finance verification, CMS publish, CME review, communications  
5. **Platform Operator** — Ajir provisions organisations, domains, plans, and features  

## Commercial intent (Ajir)

- Sell as a multi-tenant SaaS with plans/limits and feature flags  
- Keep modules extractable for other Ajir products (`@ajir/*` packages when a second product needs them)  
- Prefer a modular monolith over premature microservices  

## Non-goals (near term)

- Hardcoding NMA (or any single association) in source  
- Shipping Flutter in Phase 1  
- Cooperative Society ledger in Phase 1  
- National↔branch data federation in v1 schema  

## Success looks like

- A new association can be provisioned with domains and an admin invite **without a code change**  
- NMA Ogun runs day-to-day secretariat work (members, dues, content) on the platform  
- A second tenant can go live with different branding and custom fields using the same release  

## Related documents

- [ARCHITECTURE.md](./ARCHITECTURE.md)  
- [docs/specs/FUNCTIONAL_SPECIFICATION.md](./docs/specs/FUNCTIONAL_SPECIFICATION.md)  
- [docs/database/DATABASE_ARCHITECTURE.md](./docs/database/DATABASE_ARCHITECTURE.md)  
- [ROADMAP.md](./ROADMAP.md)  
