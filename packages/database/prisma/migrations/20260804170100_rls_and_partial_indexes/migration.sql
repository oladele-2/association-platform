-- Milestone 1: RLS helpers, FORCE RLS policies, partial uniques, CHECKs
-- Applied after Prisma baseline tables exist.
-- Neon / PostgreSQL 16

CREATE OR REPLACE FUNCTION app_current_org_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.organization_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app_is_platform() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(current_setting('app.is_platform', true), 'false') = 'true'
$$;

-- ---------------------------------------------------------------------------
-- Helper: apply standard tenant isolation to a table with organization_id
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'organization_domains',
    'organization_features',
    'organization_branding',
    'organization_subscriptions',
    'users',
    'refresh_tokens',
    'password_reset_tokens',
    'email_verification_tokens',
    'device_tokens',
    'roles',
    'user_roles',
    'membership_types',
    'members',
    'field_definitions',
    'member_field_values',
    'institutions',
    'institution_members',
    'institution_admins',
    'fee_schedules',
    'fee_rules',
    'invoices',
    'payments',
    'payment_allocations',
    'payment_evidence',
    'paystack_transactions',
    'receipts',
    'bulk_remittances',
    'bulk_remittance_lines',
    'files',
    'content_items',
    'content_assets',
    'committees',
    'committee_members',
    'cme_submissions',
    'events',
    'event_speakers',
    'event_assets',
    'event_registrations',
    'email_templates',
    'email_campaigns',
    'email_deliveries',
    'notifications',
    'idempotency_keys'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         FOR ALL
         USING (app_is_platform() OR organization_id = app_current_org_id())
         WITH CHECK (app_is_platform() OR organization_id = app_current_org_id())',
      t
    );
  END LOOP;
END $$;

-- organizations: keyed by id, not organization_id
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON organizations;
CREATE POLICY tenant_isolation ON organizations
  FOR ALL
  USING (app_is_platform() OR id = app_current_org_id())
  WITH CHECK (app_is_platform() OR id = app_current_org_id());

-- Nullable-org tables
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON audit_logs;
CREATE POLICY tenant_isolation ON audit_logs
  FOR ALL
  USING (
    app_is_platform()
    OR (organization_id IS NOT NULL AND organization_id = app_current_org_id())
  )
  WITH CHECK (
    app_is_platform()
    OR (organization_id IS NOT NULL AND organization_id = app_current_org_id())
  );

ALTER TABLE domain_event_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_event_outbox FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON domain_event_outbox;
CREATE POLICY tenant_isolation ON domain_event_outbox
  FOR ALL
  USING (
    app_is_platform()
    OR (organization_id IS NOT NULL AND organization_id = app_current_org_id())
  )
  WITH CHECK (
    app_is_platform()
    OR (organization_id IS NOT NULL AND organization_id = app_current_org_id())
  );

-- ---------------------------------------------------------------------------
-- Partial unique indexes (soft-delete / status aware)
-- Drop Prisma full uniques where they conflict, then recreate as partial.
-- ---------------------------------------------------------------------------

DROP INDEX IF EXISTS membership_types_organization_id_code_key;
CREATE UNIQUE INDEX membership_types_org_code_active_uq
  ON membership_types (organization_id, code)
  WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS users_organization_id_email_idx;
CREATE UNIQUE INDEX users_org_email_active_uq
  ON users (organization_id, email)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX members_org_membership_no_uq
  ON members (organization_id, membership_no)
  WHERE membership_no IS NOT NULL AND deleted_at IS NULL;

DROP INDEX IF EXISTS content_items_organization_id_type_slug_key;
CREATE UNIQUE INDEX content_items_org_type_slug_active_uq
  ON content_items (organization_id, type, slug)
  WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS events_organization_id_slug_key;
CREATE UNIQUE INDEX events_org_slug_active_uq
  ON events (organization_id, slug)
  WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS committees_organization_id_slug_key;
CREATE UNIQUE INDEX committees_org_slug_active_uq
  ON committees (organization_id, slug)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX institutions_org_code_active_uq
  ON institutions (organization_id, code)
  WHERE code IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX institution_members_active_uq
  ON institution_members (institution_id, member_id)
  WHERE employment_status = 'active';

CREATE UNIQUE INDEX invoices_open_member_schedule_uq
  ON invoices (member_id, fee_schedule_id)
  WHERE status NOT IN ('cancelled', 'void');

CREATE UNIQUE INDEX organization_domains_primary_uq
  ON organization_domains (organization_id, purpose)
  WHERE is_primary = true;

-- ---------------------------------------------------------------------------
-- CHECK constraints
-- ---------------------------------------------------------------------------

ALTER TABLE fee_rules DROP CONSTRAINT IF EXISTS fee_rules_amount_nonneg;
ALTER TABLE fee_rules
  ADD CONSTRAINT fee_rules_amount_nonneg CHECK (amount_kobo >= 0);

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_amount_positive;
ALTER TABLE payments
  ADD CONSTRAINT payments_amount_positive CHECK (amount_kobo > 0);

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payer_shape;
ALTER TABLE payments
  ADD CONSTRAINT payments_payer_shape CHECK (
    (payer_type = 'member' AND member_id IS NOT NULL)
    OR (payer_type = 'institution' AND institution_id IS NOT NULL)
  );

ALTER TABLE payment_allocations DROP CONSTRAINT IF EXISTS payment_allocations_amount_positive;
ALTER TABLE payment_allocations
  ADD CONSTRAINT payment_allocations_amount_positive CHECK (amount_kobo > 0);

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_amounts_nonneg;
ALTER TABLE invoices
  ADD CONSTRAINT invoices_amounts_nonneg CHECK (
    amount_due_kobo >= 0 AND amount_paid_kobo >= 0
  );
