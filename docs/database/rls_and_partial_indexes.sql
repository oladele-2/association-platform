-- Association Management Platform — RLS policies (ARCHITECTURE REVIEW ONLY)
-- Apply AFTER tables exist. App role must NOT be table owner / bypass RLS.
-- Companion to docs/database/schema.prisma and DATABASE_ARCHITECTURE.md

-- Example session setup (application, per request transaction):
--   SET LOCAL app.organization_id = '<uuid>';
--   SET LOCAL app.is_platform = 'false';
-- Platform operator routes:
--   SET LOCAL app.is_platform = 'true';

CREATE OR REPLACE FUNCTION app_current_org_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.organization_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app_is_platform() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(current_setting('app.is_platform', true), 'false') = 'true'
$$;

-- Template for every tenant table with organization_id NOT NULL:
-- ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE <table> FORCE ROW LEVEL SECURITY;
-- CREATE POLICY tenant_isolation ON <table>
--   FOR ALL
--   USING (app_is_platform() OR organization_id = app_current_org_id())
--   WITH CHECK (app_is_platform() OR organization_id = app_current_org_id());

-- Tenant tables requiring this policy (v1):
-- organization_domains, organization_features, organization_branding,
-- users, refresh_tokens, password_reset_tokens, email_verification_tokens, device_tokens,
-- roles, user_roles,
-- membership_types, members, field_definitions, member_field_values,
-- institutions, institution_members, institution_admins,
-- fee_schedules, fee_rules, invoices, payments, payment_allocations,
-- payment_evidence, paystack_transactions, receipts,
-- bulk_remittances, bulk_remittance_lines,
-- files, content_items, content_assets, committees, committee_members,
-- cme_submissions, events, event_speakers, event_assets, event_registrations,
-- email_templates, email_campaigns, email_deliveries, notifications,
-- idempotency_keys
-- audit_logs / domain_event_outbox: allow org match OR (platform AND organization_id IS NULL)

-- Platform tables (NO tenant RLS; grant only to operator role):
-- plans, platform_users, platform_roles, platform_user_roles, organization_subscriptions
-- permissions (global catalog): SELECT for app; write for migrator only
-- organizations: platform writes; app may SELECT current org row only via policy if exposed

-- Partial unique indexes (soft delete) — examples (raw SQL; Prisma cannot express all):
-- CREATE UNIQUE INDEX users_org_email_active_uq
--   ON users (organization_id, email) WHERE deleted_at IS NULL;
-- CREATE UNIQUE INDEX members_org_membership_no_uq
--   ON members (organization_id, membership_no)
--   WHERE membership_no IS NOT NULL AND deleted_at IS NULL;
-- CREATE UNIQUE INDEX members_org_user_active_uq
--   ON members (organization_id, user_id)
--   WHERE user_id IS NOT NULL AND deleted_at IS NULL;
-- CREATE UNIQUE INDEX content_items_org_type_slug_uq
--   ON content_items (organization_id, type, slug) WHERE deleted_at IS NULL;
-- CREATE UNIQUE INDEX events_org_slug_uq
--   ON events (organization_id, slug) WHERE deleted_at IS NULL;
-- CREATE UNIQUE INDEX institutions_org_code_uq
--   ON institutions (organization_id, code)
--   WHERE code IS NOT NULL AND deleted_at IS NULL;
-- CREATE UNIQUE INDEX institution_members_active_uq
--   ON institution_members (institution_id, member_id)
--   WHERE employment_status = 'active';
-- CREATE UNIQUE INDEX invoices_open_member_schedule_uq
--   ON invoices (member_id, fee_schedule_id)
--   WHERE status NOT IN ('cancelled', 'void');
-- CREATE UNIQUE INDEX organization_domains_primary_uq
--   ON organization_domains (organization_id, purpose)
--   WHERE is_primary = true;

-- CHECK constraint examples:
-- ALTER TABLE payments ADD CONSTRAINT payments_amount_positive CHECK (amount_kobo > 0);
-- ALTER TABLE payments ADD CONSTRAINT payments_payer_shape CHECK (
--   (payer_type = 'member' AND member_id IS NOT NULL AND institution_id IS NULL)
--   OR (payer_type = 'institution' AND institution_id IS NOT NULL)
-- );
-- ALTER TABLE fee_rules ADD CONSTRAINT fee_rules_amount_nonneg CHECK (amount_kobo >= 0);
-- ALTER TABLE payment_allocations ADD CONSTRAINT payment_allocations_amount_positive CHECK (amount_kobo > 0);
