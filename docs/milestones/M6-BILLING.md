# Milestone 6 — Billing API (completion report)

**Status:** Approved (2026-08-05)  
**Depends on:** M5 Members + Institutions (Approved)  
**Scope:** API only — fee schedules, invoices, Paystack (mock/live), manual verify/reject, receipts, **institution bulk remittance**.

## Exit criteria

| Criterion | Status |
|---|---|
| Fee schedules + rules (activate / generate invoices) | Done |
| Member Paystack initialize + webhook settle | Done |
| Manual evidence + admin verify/reject | Done |
| Receipts on successful settle | Done |
| Institution bulk remittance + Paystack/evidence | Done |
| Money as BIGINT kobo / decimal strings in JSON | Done |
| Production fail-closed Paystack (`PAYSTACK_SECRET_KEY` or `ALLOW_MOCK_PAYSTACK`) | Done |
| Atomic settlement (CAS + single tenant transaction) | Done |
| Webhook amount **and** currency match | Done |
| Remittance evidence amount = sum of matched lines | Done |
| `isOptionalExempt` honored for dues-exempt members | Done |
| Tests | Done |
| Docs | Done (this file) |
| `pnpm lint` / `pnpm build` / `pnpm test` green | Done |

## Module

| Path | Responsibility |
|---|---|
| `apps/api/src/modules/billing` | Fees, invoices, payments, Paystack gateway, webhook, bulk remittance |

## Money

All amounts are **BIGINT kobo** exposed as **decimal strings** in JSON (never floats). Paystack initialize amounts are validated against `Number.MAX_SAFE_INTEGER` before JSON serialization.

## HTTP surface

### Admin (`payments.read` / `payments.verify`)

| Path | Permission |
|---|---|
| `GET/POST /v1/admin/fee-schedules`, `GET/PATCH .../:id` | read / verify |
| `POST .../:id/activate`, `POST .../:id/generate-invoices` | verify |
| `POST/PATCH/DELETE .../:id/rules[/:ruleId]` | verify |
| `GET /v1/admin/invoices`, `GET .../:id` | read |
| `POST .../invoices/:id/waive\|void` | verify |
| `GET /v1/admin/payments?status=`, `GET .../:id` | read |
| `POST .../payments/:id/verify\|reject` | verify |
| `GET /v1/admin/bulk-remittances`, `GET .../:id` | read |
| `POST .../bulk-remittances/:id/lines/:lineId/resolve` | verify |

### Me (member linked via `userId`)

| Path |
|---|
| `GET /v1/me/invoices`, `GET /v1/me/payments`, `GET /v1/me/payments/:id` |
| `POST /v1/me/payments/paystack/initialize` `{ invoiceIds, idempotencyKey }` |
| `POST /v1/me/payments/manual` (optional ready `fileId` purpose `payment_evidence`) |
| `GET /v1/me/receipts` |

### Institution (must be `institution_admins` + `payments.read`)

| Path |
|---|
| `GET/POST /v1/institution/bulk-remittances` (`institutionId` query/body) |
| `GET .../:id`, `POST .../:id/submit` |
| `POST .../:id/paystack/initialize`, `POST .../:id/evidence` |
| `GET /v1/institution/payments?institutionId=` |

### Webhook

| Path | Notes |
|---|---|
| `POST /v1/webhooks/paystack` | HMAC `x-paystack-signature` (mock: literal `mock`); verify + amount/currency match; CAS settle |

## Remittance flow

1. Create draft with lines (auto-match by member + open invoice when possible)  
2. Submit → `submitted`  
3. Paystack initialize **or** manual evidence → institution payment linked  
4. On succeed → allocate matched invoices + remittance → `allocated`  
5. Admin resolve unmatched lines → `closed` when all matched/excluded  

Evidence `amountKobo` (when provided) must equal the sum of matched line allocations.

## Paystack

- Port: `PAYMENT_GATEWAY` → `PaystackPaymentGateway`
- Env: `PAYSTACK_SECRET_KEY` → live; unset → **mock** (`PAYMENTS_DRIVER=mock`)
- Production without a secret requires explicit `ALLOW_MOCK_PAYSTACK=true`
- Mock initialize stores amount for verify; mock webhook requires `x-paystack-signature: mock`
- Nest `rawBody: true` enabled for signature verification
- Settlement is a single tenant transaction with payment-status CAS (webhook: `pending` → `succeeded`; manual: `awaiting_verification` → `succeeded`)

## Fee rules / exemption

- `duesExempt` members skip rules with `isOptionalExempt: true` (waivable)
- Forced rules (`isOptionalExempt: false`) still invoice exempt members

## Intentionally deferred

- CSV import for remittance lines  
- Finance reports / aging exports  
- Receipt PDF generation  
- Outbox email workers  
- Portal / Flutter billing UI (M8 / F1)

## Verify

```bash
pnpm lint && pnpm build && pnpm test
```

Optional env: `PAYSTACK_SECRET_KEY`  
Swagger: `/docs`

## Approval gate

- [x] Approve M6 → authorize **Milestone 7** (CMS / web) only when explicitly requested
