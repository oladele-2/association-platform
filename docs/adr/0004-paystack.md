# ADR 0004: Paystack as primary payment gateway

- **Status:** Accepted
- **Date:** 2026-08-04
- **Deciders:** Product / Architecture review
- **Related:** ADR 0002, billing tables in database architecture

## Context

Members and institutions must pay association dues online in Nigeria, while many still use bank transfer. Phase 1 requires both **online card/transfer via a gateway** and **manual evidence upload + admin verification**.

Alternatives: Flutterwave-only, Paystack-only, manual-only, both gateways day one.

## Decision

- **Phase 1 channels:** `paystack` + `manual` + `bulk_institution` (data model already supports these)
- Integrate **Paystack** behind a domain port `PaymentGateway`
- Infrastructure: `PaystackPaymentGateway` + webhook controller with **signature verification** and **idempotent** handling (`paystack_transactions`, `idempotency_keys`, unique payment `reference`)
- Billing domain state machine remains provider-agnostic (`pending` → `succeeded` / `failed` / `awaiting_verification` → …)
- Manual evidence is a first-class path (`payment_evidence`), not a temporary hack
- Flutterwave (or others) may be added later as additional adapters **without** rewriting invoice/payment aggregates

Money is stored as **BIGINT kobo** + currency code — never floating point.

## Consequences

### Positive

- Best default for Nigerian cards/USSD/bank channels for the first market
- Port/adapter design preserves commercial optionality
- Explicit reconciliation model (allocations, bulk remittance unmatched lines)

### Negative / risks

- Webhook vs redirect race conditions — design payment status UI to poll/refresh
- Split brain if webhook secret misconfigured — fail closed and alert
- Manual path increases treasurer workload — queue UX is mandatory

### Follow-ups

- Milestone 7: billing bounded context, Paystack initialize + webhook, manual verify use cases
- Document go-live checklist: webhook URL per env, secrets, test vs live keys per tenant config
