# ARCHITECTURE_SPEC.md — Especificación de Arquitectura de LogiClear AI

**Plataforma B2B Enterprise SaaS — Conciliación Aduanera y Landed Cost Determinista**  
**Versión:** 1.0.0  
**Autor:** @architecture_master (Principal Software Architect)  
**Fecha de Publicación:** 2026-10-09  

---

## 1. Mapeo de Bounded Contexts y Dominios

La plataforma se organiza en cuatro contextos delimitados (Bounded Contexts) estrictamente aislados:

```
+---------------------------------------------------------------------------------------+
|                                    LOGICLEAR AI SAAS                                  |
|                                                                                       |
|  +--------------------------------+          +------------------------------------+   |
|  |   1. IDENTITY & TENANCY        |          |   2. CUSTOMS INGESTION & OCR       |   |
|  |   - Tenants & Organizations    |          |   - Document Extraction Schemas    |   |
|  |   - Members & Role RBAC        |          |   - Multimodal Ingestion Pipeline  |   |
|  |   - RLS Context Enforcer       |          |   - Zero-Hallucination Gate        |   |
|  +---------------+----------------+          +-----------------+------------------+   |
|                  |                                             |                      |
|                  | (Tenant ID)                                 | (Normalized Items)   |
|                  v                                             v                      |
|  +--------------------------------+          +------------------------------------+   |
|  |   3. RECONCILIATION & LANDED   |          |   4. BILLING & SUBSCRIPTIONS       |   |
|  |   - Deterministic Math Engine  |<---------|   - Stripe Tier Governance         |   |
|  |   - Proration (Weight & Value) | (Quotas) |   - Webhook HMAC Idempotency       |   |
|  |   - Discrepancy Audits & LEDGER|          |   - Metered Shipment Limits        |   |
|  +--------------------------------+          +------------------------------------+   |
+---------------------------------------------------------------------------------------+
```

### Contexto 1: Identity & Tenancy
- **Responsabilidad:** Autenticación corporativa, gestión de organizaciones, membresías y setting de contexto en tiempo de ejecución (`app.current_tenant_id`) en PostgreSQL para asegurar Row Level Security (RLS) infranqueable.
- **Entidades:** `Tenant`, `TenantMember`, `AuditLog`.

### Contexto 2: Customs Ingestion & Extraction (GenAI)
- **Responsabilidad:** Procesamiento de documentos aduaneros (Factura Comercial, Bill of Lading, DUA/DAM, comprobantes de gastos locales) mediante LLM multimodal con esquemas estrictos Zod y JSON Schema.
- **Regla Inquebrantable:** Temperatura `0.0`. Validación de totales declarados frente a la suma de partidas. Rechazo inmediato de extracciones con discrepancias aritméticas internas en el documento.
- **Entidades:** `DocumentSource`, `ExtractionPayload`, `DocumentValidationResult`.

### Contexto 3: Reconciliation Engine & Landed Cost Ledger
- **Responsabilidad:** Motor determinista que ejecuta:
  1. Comparación 1:1 entre lo facturado en origen y lo liquidado en la DUA aduanera (código arancelario, valor FOB, peso, país de origen).
  2. Prorrateo de Flete internacional (por peso bruto/neto).
  3. Prorrateo de Seguro y gastos locales (por valor FOB).
  4. Liquidación de Ad-Valorem por partida arancelaria específica.
  5. Cálculo de IGV (16%), IPM (2%) y Percepción aduanera aplicable (3.5%, 5% o 10%).
  6. Determinación del Costo Unitario puesto en almacén (*Landed Cost per Unit*).
  7. Marcado de semáforo de discrepancia:
     - 🟢 **VERDE (Conforme):** Discrepancia absoluta $\le \$0.01$ o relativa $\le 0.05\%$.
     - 🟡 **AMARILLO (Advertencia):** Discrepancia tolerable entre $\$0.01$ y $\$10.00$ o diferencia arancelaria menor en gastos locales.
     - 🔴 **ROJO (Alerta Crítica):** Discrepancia $> \$10.00$, inconsistencia de Incoterm, o partida arancelaria discordante.
- **Entidades:** `ShipmentDossier`, `DossierDocument`, `LineItem`, `LandedCostBreakdown`, `ReconciliationAudit`.

### Contexto 4: Billing & Subscriptions
- **Responsabilidad:** Gestión de monetización B2B vía Stripe:
  - Tier `Starter`: \$99/mes, cupo máximo de 50 despachos al mes.
  - Tier `Enterprise Pro`: \$349/mes, despachos ilimitados, conciliación multi-moneda prioritaria.
  - Validación de firmas criptográficas HMAC en Webhooks con tabla transaccional de idempotencia para prevenir duplicidad o replay attacks.
- **Entidades:** `Subscription`, `BillingQuota`, `ProcessedWebhookEvent`.

---

## 2. Diagrama de Flujo de Datos Transaccional (Sequence)

```
User (Browser)               Next.js App / API           GenAI Pipeline        Reconciliation Engine      PostgreSQL (RLS)
     |                              |                          |                        |                        |
     | 1. Upload Expediente Folder  |                          |                        |                        |
     |----------------------------->|                          |                        |                        |
     |                              | 2. Persist Documents     |                        |                        |
     |                              |--------------------------------------------------------------------------->|
     |                              | 3. Dispatch Extraction   |                        |                        |
     |                              |------------------------->|                        |                        |
     |                              |                          | 4. Validate Zod/Math   |                        |
     |                              | 5. Extraction Complete   |<-----------------------+                        |
     |                              |<-------------------------|                        |                        |
     |                              | 6. Trigger Reconciliation|                        |                        |
     |                              |-------------------------------------------------->|                        |
     |                              |                          |                        | 7. Deterministic Math  |
     |                              |                          |                        |    Weight/FOB Proration|
     |                              | 8. Audit & Landed Cost   |<-----------------------|                        |
     |                              |--------------------------------------------------------------------------->|
     |                              |                          |                        |                        | 9. Commit ACID
     | 10. Render Dual View Matrix  |<---------------------------------------------------------------------------|
     |<-----------------------------|                          |                        |                        |
```

---

## 3. Contrato de Calidad de la Arquitectura

1. **Pureza de TypeScript:** Código compilado con `strict: true`, `noImplicitAny: true`, `exactOptionalPropertyTypes: true`.
2. **Resiliencia ante Desconexiones:** Todas las operaciones de cálculo son funciones puras idempotentes.
3. **Cero Dependencia de Red en el Cálculo:** La lógica de liquidación aduanera no requiere llamadas a APIs de terceros durante el ciclo matemático.
