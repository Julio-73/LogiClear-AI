# MIGRATION_PLAN.md — Plan de Migración y Gobernanza de Base de Datos

**Proyecto:** LogiClear AI (Enterprise B2B SaaS)  
**Autor:** @database_master (Database Master V2.0)  
**Fecha:** 2026-10-09  
**Objetivo:** Garantizar la evolución del esquema relacional ACID con cero tiempo de inactividad, aislamiento multi-tenant por Row Level Security (RLS) y reversibilidad garantizada.

---

## 1. Estrategia de Migración: Expand-and-Contract

Para asegurar despliegues sin interrupción del servicio (Zero-Downtime Deployment), toda alteración futura de esquema se apega al patrón Expand-and-Contract:
1. **Fase Expand (Adición no bloqueante):** Nuevas columnas o tablas se agregan como opcionales (`NULL` o con `DEFAULT` constante precalculado).
2. **Fase Transition (Dual-Write/Read):** El backend escribe en ambas estructuras y lee de la versión canónica.
3. **Fase Backfill (Población en lotes):** Migración de datos históricos en batches de 5,000 registros para evitar locks prolongados en tablas críticas (`line_items`, `shipments`).
4. **Fase Contract (Deprecación segura):** Se eliminan columnas obsoletas tras la validación de 3 ciclos de release.

---

## 2. Protocolo de Ejecución de la Migración

### Paso 1: Pre-Migration Check
- Verificar que las conexiones activas no superen el 70% del pool (`max_connections`).
- Comprobar que no existan transacciones bloqueadas (`pg_locks`).
- Respaldar snapshot PITR (Point-in-Time Recovery) en storage seguro.

### Paso 2: Ejecución Transaccional
```bash
# Ejecución bajo transacción segura con timeout de lock controlado (máximo 5 segundos)
psql -v ON_ERROR_STOP=1 -c "SET lock_timeout = '5s';" -f database/schema.sql
```

### Paso 3: Post-Migration Quality Gates
- Verificar que las 7 tablas tengan RLS habilitado:
  ```sql
  SELECT tablename, rowsecurity 
  FROM pg_tables 
  WHERE schemaname = 'public' 
    AND tablename IN ('tenants', 'users', 'shipments', 'documents', 'line_items', 'reconciliation_audits', 'processed_webhooks');
  -- Todas las filas deben devolver rowsecurity = true
  ```
- Validar aislamiento con dos tenants de prueba `T1` y `T2`:
  - En la sesión con `SET LOCAL app.current_tenant_id = 'T1'`, una consulta `SELECT COUNT(*) FROM shipments` solo debe devolver los expedientes de `T1`.
  - Intentar leer registros de `T2` debe devolver 0 filas (aislamiento estricto, sin error pero sin fuga).

---

## 3. Presupuesto de Rendimiento y SLAs de Latencia (OLTP)

| Consulta Crítica | Índice Compuesto Asignado | SLA Latencia P95 |
| :--- | :--- | :--- |
| Carga de Expediente por Estado | `idx_shipments_tenant_status (tenant_id, status)` | $< 5\text{ ms}$ |
| Listado de Partidas por Arancel | `idx_line_items_tenant_shipment_hs (tenant_id, shipment_id, hs_code)` | $< 8\text{ ms}$ |
| Búsqueda de Evento de Webhook | `idx_webhooks_idempotency_key (idempotency_key)` | $< 2\text{ ms}$ |
| Histórico de Auditorías de Conciliación | `idx_reconciliation_tenant_shipment (tenant_id, shipment_id, audit_sequence DESC)` | $< 4\text{ ms}$ |

---

## 4. Plan de Contingencia y Rollback Inmediato

En caso de fallo en la compuerta de integridad:
1. El script transaccional revierte automáticamente con `ROLLBACK` en caso de error DDL.
2. Si el fallo ocurre post-deploy, se aplica `database/rollback.sql` restaurando el estado previo sin pérdida de transacciones confirmadas.
