# Milestone — Billing API (completion report)

**Status:** Complete — awaiting review  
**Scope:** API only — fee schedules, invoices, Paystack (mock/live), manual verify/reject, receipts, **institution bulk remittance**.

## Module

| Path | Responsibility |
|---|---|
| `apps/api/src/modules/billing` | Fees, invoices, payments, Paystack gateway, webhook, bulk remittance |

## Money

All amounts are **BIGINT kobo** exposed as **decimal strings** in JSON (never floats).

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
| `POST /v1/me/payments/manual` (optional `fileId` until Files M4) |
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
| `POST /v1/webhooks/paystack` | HMAC `x-paystack-signature`; idempotent settle |

## Remittance flow

1. Create draft with lines (auto-match by member + open invoice when possible)  
2. Submit → `submitted`  
3. Paystack initialize **or** manual evidence → institution payment linked  
4. On succeed → allocate matched invoices + remittance → `allocated`  
5. Admin resolve unmatched lines → `closed` when all matched/excluded  

## Paystack

- Port: `PAYMENT_GATEWAY` → `PaystackPaymentGateway`
- If `PAYSTACK_SECRET_KEY` is unset → **mock mode**
- Nest `rawBody: true` enabled for signature verification

## Intentionally deferred

- CSV import for remittance lines  
- Finance reports / aging exports  
- Receipt PDF generation  
- Files upload for evidence (optional `fileId` until M4)  
- Outbox email workers  

## Verify

```bash
pnpm lint && pnpm build && pnpm test
```

Optional env: `PAYSTACK_SECRET_KEY`  
Swagger: `/docs`
