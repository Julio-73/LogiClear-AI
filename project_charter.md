# PROJECT CHARTER — LOGICLEAR AI (ENTERPRISE B2B SAAS)

**Versión:** 1.0.0  
**Fecha:** 2026-10-09  
**Gobernanza:** Project Orchestrator V4.1 (CTO Loop Adaptativo)  
**Clasificación de Riesgo:** HIGH (SaaS Multi-tenant, Pagos Stripe, Liquidación Aduanera)  

---

## 1. Visión del Producto
Construir y certificar la plataforma B2B "LogiClear AI" para automatizar la conciliación de importaciones internacionales, cotejo 1:1 entre declaraciones aduaneras (DUA / DAM) y facturas comerciales en origen, y cálculo determinista de Landed Cost (costo total puesto en almacén).

## 2. Alcance del Sistema
1. **Multi-Tenancy Hermético:** Row Level Security (RLS) en PostgreSQL sobre 7 entidades transaccionales.
2. **Ingesta Multimodal GenAI Zero-Hallucination:** Calibración a Temperatura 0.0 con validación Zod y balance aritmético.
3. **Motor Determinista de Landed Cost:** Prorrateo de flete por peso, seguro y gastos locales por valor, y liquidación de tributos (Ad-Valorem, IGV, IPM, Percepciones).
4. **Semáforos de Discrepancia:** Tri-color (Verde $\le \$0.01$, Amarillo $\le \$10.00$, Rojo $> \$10.00$ o error de nomenclatura).
5. **Dashboard B2B:** Vista comparativa 1:1, drag-and-drop de carpetas, tabla de Landed Cost y soporte de los 4 estados de UI (loading, empty, error, data).
6. **Monetización Stripe:** Tiers Starter (\$99/mo) y Enterprise Pro (\$349/mo), idempotencia transaccional y validación criptográfica HMAC.
7. **Certificación Go-Live:** 69 pruebas del sistema 100% aprobadas y compilación TypeScript limpia.
