# RISK REGISTER — LOGICLEAR AI (ENTERPRISE V4.1)

| ID | Riesgo Identificado | Nivel Inicial | Mitigación Implementada | Estado Residual |
| :--- | :--- | :--- | :--- | :--- |
| **R-01** | Fuga de datos entre tenants (Data Leak) | CRITICAL | PostgreSQL Row Level Security (RLS) habilitado en las 7 tablas con sesión obligatoria `app.current_tenant_id`. | LOW |
| **R-02** | Alucinación de LLM en cálculos aduaneros | HIGH | Ingesta desacoplada del cálculo; Temperatura 0.0 obligatoria; validación estricta Zod superRefine que rechaza sumas discordantes > $0.05. | LOW |
| **R-03** | Distorsión contable en prorrateo de Landed Cost | HIGH | Motor determinista puro con precisión de 8 decimales en factores y conservación exacta del 100% de los totales declarados. | LOW |
| **R-04** | Ataque de replay o duplicidad en webhooks Stripe | HIGH | Verificación de firma HMAC SHA-256 en tiempo constante (`timingSafeEqual`), ventana de tolerancia de 300s y tabla transaccional de idempotencia. | LOW |
| **R-05** | Degradación de rendimiento en expedientes masivos | MEDIUM | Particionamiento lógico e índices compuestos (`idx_line_items_tenant_shipment_hs`, etc.); SLA verificado de < 25ms para 1,000 partidas. | LOW |
| **R-06** | Pérdida de datos ante fallos en migraciones DDL | HIGH | Script de rollback transaccional reversible (`database/rollback.sql`) y estrategia Expand-and-Contract documentada. | LOW |
