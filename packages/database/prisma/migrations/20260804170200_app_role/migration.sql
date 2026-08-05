-- App role subject to FORCE RLS (owner / BYPASSRLS roles skip policies).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'association_app') THEN
    CREATE ROLE association_app NOLOGIN NOBYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO association_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO association_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO association_app;
GRANT EXECUTE ON FUNCTION app_current_org_id() TO association_app;
GRANT EXECUTE ON FUNCTION app_is_platform() TO association_app;

-- Allow the connected migrator/owner to SET ROLE association_app in tests/API bootstrap.
GRANT association_app TO CURRENT_USER;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO association_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO association_app;
