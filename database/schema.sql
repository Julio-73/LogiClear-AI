-- ==============================================================================
-- LOGICLEAR AI — ENTERPRISE B2B SAAS ACID POSTGRESQL SCHEMA
-- Version: 1.0.0
-- Standard: Enterprise V4.1 Multi-Tenant RLS & Cryptographic Hash Auditing
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. DOMAIN ENUMS
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('superadmin', 'tenant_admin', 'customs_specialist', 'auditor', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE shipment_status_enum AS ENUM ('draft', 'documents_uploaded', 'ocr_processing', 'reconciled', 'discrepancy_alert', 'audited', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE document_type_enum AS ENUM ('commercial_invoice', 'bill_of_lading', 'dua_customs_declaration', 'local_expenses_receipt', 'insurance_policy');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE extraction_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed_schema', 'failed_checksum');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE discrepancy_severity_enum AS ENUM ('green', 'yellow', 'red');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_tier_enum AS ENUM ('starter', 'enterprise_pro', 'custom_enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. ORGANIZATIONS / TENANTS TABLE
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(32) NOT NULL, -- RUC, VAT, EIN
    plan_tier subscription_tier_enum NOT NULL DEFAULT 'starter',
    stripe_customer_id VARCHAR(128) UNIQUE,
    stripe_subscription_id VARCHAR(128),
    subscription_status VARCHAR(64) NOT NULL DEFAULT 'active',
    monthly_shipments_quota INT NOT NULL DEFAULT 50,
    monthly_shipments_consumed INT NOT NULL DEFAULT 0,
    billing_period_starts_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    billing_period_ends_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. USERS AND MEMBERSHIPS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'customs_specialist',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. SHIPMENTS (EXPEDIENTES DE IMPORTACIÓN)
CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    dossier_number VARCHAR(64) NOT NULL, -- e.g. EXP-2026-0042
    customs_regime VARCHAR(16) NOT NULL DEFAULT '10', -- Importación definitiva
    incoterm VARCHAR(8) NOT NULL, -- FOB, CIF, CFR, EXW, DDP
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    exchange_rate NUMERIC(10, 4) NOT NULL DEFAULT 1.0000,
    port_of_origin VARCHAR(128) NOT NULL,
    port_of_destination VARCHAR(128) NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    status shipment_status_enum NOT NULL DEFAULT 'draft',
    total_fob_declared NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_freight_declared NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_insurance_declared NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_local_expenses NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_gross_weight_kg NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    total_net_weight_kg NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    final_landed_cost_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    audit_hash_sha256 VARCHAR(64),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tenant_dossier UNIQUE (tenant_id, dossier_number)
);

-- 6. DOCUMENTS (FACTURA, BL, DUA, GASTOS LOCALES)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    document_type document_type_enum NOT NULL,
    official_number VARCHAR(128) NOT NULL, -- Número de factura, BL o DUA
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(64) NOT NULL,
    storage_url TEXT NOT NULL,
    sha256_checksum VARCHAR(64) NOT NULL,
    extraction_status extraction_status_enum NOT NULL DEFAULT 'pending',
    extracted_data_json JSONB,
    raw_ocr_text TEXT,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    extracted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. LINE ITEMS (PARTIDAS ARANCELARIAS Y DESGLOSE DETALLADO)
CREATE TABLE IF NOT EXISTS line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    item_sequence INT NOT NULL,
    hs_code VARCHAR(16) NOT NULL, -- Subpartida nacional / arancelaria (10 dígitos)
    commercial_code VARCHAR(64),
    description TEXT NOT NULL,
    quantity NUMERIC(14, 4) NOT NULL,
    unit_of_measure VARCHAR(16) NOT NULL DEFAULT 'UN',
    unit_price_fob NUMERIC(14, 4) NOT NULL,
    total_fob NUMERIC(15, 2) NOT NULL,
    net_weight_kg NUMERIC(12, 3) NOT NULL,
    gross_weight_kg NUMERIC(12, 3) NOT NULL,
    -- Factores de Prorrateo
    weight_proration_factor NUMERIC(10, 8) NOT NULL DEFAULT 0.00000000,
    value_proration_factor NUMERIC(10, 8) NOT NULL DEFAULT 0.00000000,
    -- Desglose de Costos Asignados
    prorated_freight NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    prorated_insurance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    customs_cif NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    -- Aranceles y Tributos Aduaneros
    ad_valorem_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.0000, -- e.g. 0.0000, 0.0600, 0.1100
    ad_valorem_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    igv_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.1600, -- 16%
    igv_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    ipm_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.0200, -- 2%
    ipm_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    perception_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.0350, -- 3.5%, 5% o 10%
    perception_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    prorated_local_expenses NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    -- Landed Cost Definitivo
    landed_cost_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    landed_cost_unit NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_shipment_sequence UNIQUE (shipment_id, item_sequence)
);

-- 8. RECONCILIATION AUDITS (COTEJO Y DISCREPANCIAS ADUANERAS)
CREATE TABLE IF NOT EXISTS reconciliation_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    audit_sequence INT NOT NULL DEFAULT 1,
    is_conforming BOOLEAN NOT NULL DEFAULT TRUE,
    severity discrepancy_severity_enum NOT NULL DEFAULT 'green',
    invoice_fob_total NUMERIC(15, 2) NOT NULL,
    dua_fob_total NUMERIC(15, 2) NOT NULL,
    fob_discrepancy NUMERIC(15, 2) NOT NULL,
    freight_discrepancy NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    insurance_discrepancy NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax_discrepancy NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    max_discrepancy_amount NUMERIC(15, 2) NOT NULL,
    discrepancy_summary TEXT,
    item_discrepancies_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    audit_hash_sha256 VARCHAR(64) NOT NULL,
    audited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    audited_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. PROCESSED WEBHOOKS (IDEMPOTENCIA DE PAGOS STRIPE)
CREATE TABLE IF NOT EXISTS processed_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    provider VARCHAR(32) NOT NULL DEFAULT 'stripe',
    event_id VARCHAR(128) NOT NULL UNIQUE,
    event_type VARCHAR(128) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    payload_checksum_sha256 VARCHAR(64) NOT NULL,
    processed_status VARCHAR(32) NOT NULL DEFAULT 'processed',
    error_message TEXT,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 10. COMPOSITE INDEXES PARA ALTO RENDIMIENTO OLTP Y CONSULTAS ANALÍTICAS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_shipments_tenant_status ON shipments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_shipments_tenant_dossier ON shipments(tenant_id, dossier_number);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_shipment_type ON documents(tenant_id, shipment_id, document_type);
CREATE INDEX IF NOT EXISTS idx_line_items_tenant_shipment_hs ON line_items(tenant_id, shipment_id, hs_code);
CREATE INDEX IF NOT EXISTS idx_reconciliation_tenant_shipment ON reconciliation_audits(tenant_id, shipment_id, audit_sequence DESC);
CREATE INDEX IF NOT EXISTS idx_webhooks_event_provider ON processed_webhooks(event_id, provider);
CREATE INDEX IF NOT EXISTS idx_webhooks_idempotency_key ON processed_webhooks(idempotency_key);

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES — AISLAMIENTO HERMÉTICO POR TENANT
-- ==============================================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_webhooks ENABLE ROW LEVEL SECURITY;

-- Helper function to extract current tenant session parameter safely
CREATE OR REPLACE FUNCTION get_current_tenant_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Tenants Policy
CREATE POLICY tenant_isolation_tenants ON tenants
    FOR ALL
    USING (id = get_current_tenant_id() OR current_setting('app.is_superadmin', true) = 'true');

-- Users Policy
CREATE POLICY tenant_isolation_users ON users
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR current_setting('app.is_superadmin', true) = 'true');

-- Shipments Policy
CREATE POLICY tenant_isolation_shipments ON shipments
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR current_setting('app.is_superadmin', true) = 'true')
    WITH CHECK (tenant_id = get_current_tenant_id() OR current_setting('app.is_superadmin', true) = 'true');

-- Documents Policy
CREATE POLICY tenant_isolation_documents ON documents
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR current_setting('app.is_superadmin', true) = 'true')
    WITH CHECK (tenant_id = get_current_tenant_id() OR current_setting('app.is_superadmin', true) = 'true');

-- Line Items Policy
CREATE POLICY tenant_isolation_line_items ON line_items
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR current_setting('app.is_superadmin', true) = 'true')
    WITH CHECK (tenant_id = get_current_tenant_id() OR current_setting('app.is_superadmin', true) = 'true');

-- Reconciliation Audits Policy
CREATE POLICY tenant_isolation_reconciliation ON reconciliation_audits
    FOR ALL
    USING (tenant_id = get_current_tenant_id() OR current_setting('app.is_superadmin', true) = 'true')
    WITH CHECK (tenant_id = get_current_tenant_id() OR current_setting('app.is_superadmin', true) = 'true');

-- Processed Webhooks Policy
CREATE POLICY tenant_isolation_webhooks ON processed_webhooks
    FOR ALL
    USING (tenant_id IS NULL OR tenant_id = get_current_tenant_id() OR current_setting('app.is_superadmin', true) = 'true');

-- ==============================================================================
-- 12. TRIGGERS AUTOMÁTICOS PARA UPDATED_AT
-- ==============================================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER trg_shipments_updated_at BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER trg_line_items_updated_at BEFORE UPDATE ON line_items FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
