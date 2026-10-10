/**
 * LOGICLEAR AI — STRIPE BILLING & SUBSCRIPTION CONFIGURATION
 * Standard: PCI DSS SAQ A Compliance, Metered Quota Governance & Entitlements
 */

export interface BillingPlanDefinition {
  id: 'starter' | 'enterprise_pro';
  name: string;
  monthlyPriceUsd: number;
  monthlyShipmentsQuota: number; // -1 represents unlimited
  stripePriceId: string;
  stripeProductId: string;
  features: string[];
  entitlements: {
    maxUsers: number;
    unlimitedDossiers: boolean;
    multiCurrency: boolean;
    priorityOcrProcessing: boolean;
    dedicatedAccountManager: boolean;
    customExportCertificates: boolean;
  };
}

export const BILLING_PLANS: Record<'starter' | 'enterprise_pro', BillingPlanDefinition> = {
  starter: {
    id: 'starter',
    name: 'LogiClear Starter B2B',
    monthlyPriceUsd: 99.00,
    monthlyShipmentsQuota: 50,
    stripePriceId: 'price_starter_99mo_usd',
    stripeProductId: 'prod_logiclear_starter',
    features: [
      'Hasta 50 expedientes de importación al mes',
      'Extracción OCR multimodal Zero-Hallucination (Temp 0.0)',
      'Conciliación matemática DUA vs Factura Comercial 1:1',
      'Desglose determinista de Landed Cost y Aranceles',
      'Aislamiento Multi-Tenant con PostgreSQL RLS',
      'Hasta 3 usuarios especialistas'
    ],
    entitlements: {
      maxUsers: 3,
      unlimitedDossiers: false,
      multiCurrency: false,
      priorityOcrProcessing: false,
      dedicatedAccountManager: false,
      customExportCertificates: false
    }
  },
  enterprise_pro: {
    id: 'enterprise_pro',
    name: 'LogiClear Enterprise Pro',
    monthlyPriceUsd: 349.00,
    monthlyShipmentsQuota: -1, // Unlimited
    stripePriceId: 'price_enterprise_pro_349mo_usd',
    stripeProductId: 'prod_logiclear_enterprise_pro',
    features: [
      'Despachos y expedientes ILIMITADOS',
      'Soporte multi-moneda (USD, EUR, CNY, GBP, JPY)',
      'Procesamiento OCR prioritario en cola de alta velocidad',
      'Exportación oficial de Actas de Conciliación con firma SHA-256',
      'Soporte para agentes de aduana externos y auditores',
      'Usuarios ilimitados y SLA de respuesta 99.9%'
    ],
    entitlements: {
      maxUsers: 1000,
      unlimitedDossiers: true,
      multiCurrency: true,
      priorityOcrProcessing: true,
      dedicatedAccountManager: true,
      customExportCertificates: true
    }
  }
};

/**
 * Validates if tenant has sufficient shipment quota to process new import dossier
 */
export function checkTenantQuota(
  tier: 'starter' | 'enterprise_pro',
  currentConsumedInPeriod: number
): { allowed: boolean; remaining: number; quota: number } {
  const plan = BILLING_PLANS[tier];
  if (plan.monthlyShipmentsQuota === -1) {
    return {
      allowed: true,
      remaining: Infinity,
      quota: -1
    };
  }

  const remaining = Math.max(0, plan.monthlyShipmentsQuota - currentConsumedInPeriod);
  return {
    allowed: remaining > 0,
    remaining,
    quota: plan.monthlyShipmentsQuota
  };
}
