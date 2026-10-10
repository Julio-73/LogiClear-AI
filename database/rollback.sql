-- ==============================================================================
-- LOGICLEAR AI — REVERSIBLE ROLLBACK SCRIPT (ZERO DATA CORRUPTION)
-- Version: 1.0.0
-- Standard: Enterprise Database Master V2.0
-- ==============================================================================

BEGIN;

-- 1. DROP TRIGGERS
DROP TRIGGER IF EXISTS trg_line_items_updated_at ON line_items;
DROP TRIGGER IF EXISTS trg_documents_updated_at ON documents;
DROP TRIGGER IF EXISTS trg_shipments_updated_at ON shipments;
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
DROP TRIGGER IF EXISTS trg_tenants_updated_at ON tenants;
DROP FUNCTION IF EXISTS trigger_set_updated_at();

-- 2. DROP RLS POLICIES
DROP POLICY IF EXISTS tenant_isolation_webhooks ON processed_webhooks;
DROP POLICY IF EXISTS tenant_isolation_reconciliation ON reconciliation_audits;
DROP POLICY IF EXISTS tenant_isolation_line_items ON line_items;
DROP POLICY IF EXISTS tenant_isolation_documents ON documents;
DROP POLICY IF EXISTS tenant_isolation_shipments ON shipments;
DROP POLICY IF EXISTS tenant_isolation_users ON users;
DROP POLICY IF EXISTS tenant_isolation_tenants ON tenants;
DROP FUNCTION IF EXISTS get_current_tenant_id();

-- 3. DROP INDEXES
DROP INDEX IF EXISTS idx_webhooks_idempotency_key;
DROP INDEX IF EXISTS idx_webhooks_event_provider;
DROP INDEX IF EXISTS idx_reconciliation_tenant_shipment;
DROP INDEX IF EXISTS idx_line_items_tenant_shipment_hs;
DROP INDEX IF EXISTS idx_documents_tenant_shipment_type;
DROP INDEX IF EXISTS idx_shipments_tenant_dossier;
DROP INDEX IF EXISTS idx_shipments_tenant_status;
DROP INDEX IF EXISTS idx_users_tenant_role;
DROP INDEX IF EXISTS idx_tenants_active;

-- 4. DROP TABLES (RESPECTING FOREIGN KEY DEPENDENCIES)
DROP TABLE IF EXISTS processed_webhooks CASCADE;
DROP TABLE IF EXISTS reconciliation_audits CASCADE;
DROP TABLE IF EXISTS line_items CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- 5. DROP ENUMS
DROP TYPE IF EXISTS subscription_tier_enum;
DROP TYPE IF EXISTS discrepancy_severity_enum;
DROP TYPE IF EXISTS extraction_status_enum;
DROP TYPE IF EXISTS document_type_enum;
DROP TYPE IF EXISTS shipment_status_enum;
DROP TYPE IF EXISTS user_role_enum;

COMMIT;
