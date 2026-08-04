# ADR 0003: Cloudflare R2 for object storage

- **Status:** Accepted
- **Date:** 2026-08-04
- **Deciders:** Product / Architecture review
- **Related:** Functional spec file uploads; ADR 0001

## Context

The platform must store member photographs, CME certificates (PDF/JPG/PNG), payment evidence, receipts, gallery images, and downloadable documents. VPS local disk is unsuitable for multi-tenant scale, backups, and CDN.

Alternatives: DigitalOcean Spaces, AWS S3, local disk (dev only), Cloudflare R2.

## Decision

Store **all durable binary objects in Cloudflare R2**.

- PostgreSQL `files` table stores metadata only: bucket, object key, MIME, size, checksum, visibility, uploader, status
- Application exposes a **storage port** (`ObjectStorage`); infrastructure provides an **R2 adapter** (S3-compatible API)
- Upload flow: API issues time-limited signed PUT URL → client uploads direct to R2 → API confirms metadata
- Download of private objects: time-limited signed GET URLs
- Public website assets may use public/CDN-accessible URLs after publish policy allows

Local/dev may use MinIO or R2-compatible emulator behind the same port (Milestone 5).

## Consequences

### Positive

- No disk growth on API VPS; aligns with Cloudflare DNS/CDN already in the stack
- S3-compatible tooling; adapter can later point at Spaces/S3 if needed
- Clear security boundary: DB never holds file bytes

### Negative / risks

- Cross-cloud latency API (DO) ↔ R2 (Cloudflare) — acceptable for this product
- MIME sniffing and size limits must be enforced at signed-URL creation and confirm
- Soft-deleted DB rows vs orphaned R2 objects require lifecycle/GC jobs later

### Follow-ups

- Milestone 5: Files bounded context + R2 (or MinIO) adapter + virus/MIME allowlist
- Lifecycle rules for incomplete multipart uploads; versioning on production buckets
