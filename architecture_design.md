# ARCHITECTURE DESIGN & KNOWLEDGE GRAPH — LOGICLEAR AI

**Versión:** 1.0.0  
**Fecha:** 2026-10-09  
**Gobernanza:** Project Orchestrator V4.1  

---

## 1. Grafo de Conocimiento del Ecosistema

```mermaid
graph TD
    Client["Next.js 15 Presentation Layer (Dashboard)"]
    API["API Layer (OpenAPI 3.1 & RFC 7807)"]
    ReconEngine["Deterministic Math Engine (Landed Cost & Proration)"]
    GenAIPipeline["GenAI Multimodal Pipeline (Temp 0.0, Zod Schemas)"]
    PostgresRLS["PostgreSQL RLS Database (7 Tables ACID)"]
    StripeBilling["Stripe Billing & Webhook HMAC Handler"]

    Client -->|Invokes| API
    API -->|Calls Ingestion| GenAIPipeline
    API -->|Dispatches Math| ReconEngine
    API -->|Manages Quotas| StripeBilling
    API -->|Session RLS Queries| PostgresRLS
    ReconEngine -->|Produces Immutable SHA-256 Ledger| PostgresRLS
    GenAIPipeline -->|Validates Extracted JSON| PostgresRLS
    StripeBilling -->|Deduplicates Webhooks| PostgresRLS
```

## 2. Invariantes del Sistema
- **Invariante 1 (Aislamiento):** Toda consulta a Postgres se ejecuta bajo sesión `app.current_tenant_id`.
- **Invariante 2 (Determinismo Matemático):** La suma de costos prorrateados por partida conserva al 100% el total declarado del expediente.
- **Invariante 3 (Cero Alucinación):** Si la suma de items difiere del total declarado en más de \$0.05, la ingesta es rechazada de inmediato.
- **Invariante 4 (Idempotencia de Pagos):** Ningún evento de webhook de Stripe se procesa más de una vez.
