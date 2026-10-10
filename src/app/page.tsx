'use client';

import React, { useState, useMemo } from 'react';
import {
  CoreReconciliationEngine,
  ReconciliationReport,
  ReconciliationInput
} from '@/lib/engine/core_reconciliation_engine';
import {
  CommercialInvoiceExtraction,
  DuaCustomsDeclaration,
  LocalExpensesReceipt
} from '@/lib/genai/extraction_schemas';
import { ExecutiveDashboard, DashboardViewState } from '@/components/dashboard/ExecutiveDashboard';
import { BILLING_PLANS } from '@/lib/billing/stripe_billing_config';

// ==============================================================================
// REPRESENTATIVE SAMPLE DOSSIERS (EXPEDIENTES DE IMPORTACIÓN MARÍTIMA)
// ==============================================================================

// Dossier 1: Conforme 🟢 (China -> Callao, Tecnología)
const invoiceDossier1: CommercialInvoiceExtraction = {
  documentType: 'commercial_invoice',
  invoiceNumber: 'INV-2026-8891',
  issueDate: '2026-09-15',
  supplierName: 'Guangzhou High-Tech Components Ltd',
  buyerName: 'Importaciones Andinas SAC',
  buyerTaxId: '20601234567',
  incoterm: 'FOB',
  currency: 'USD',
  totalFobDeclared: 10000.00,
  totalNetWeightKg: 500.00,
  totalGrossWeightKg: 550.00,
  items: [
    {
      itemSequence: 1,
      hsCode: '8471300000',
      commercialCode: 'LAP-PRO-15',
      description: 'Laptops de alta gama para ingeniería (Core i9 / 32GB RAM)',
      quantity: 10,
      unitOfMeasure: 'UN',
      unitPriceFob: 600.00,
      totalFob: 6000.00,
      netWeightKg: 200.00,
      grossWeightKg: 220.00
    },
    {
      itemSequence: 2,
      hsCode: '8528520000',
      commercialCode: 'MON-4K-27',
      description: 'Monitores 4K IPS 27 pulgadas para diseño gráfico',
      quantity: 20,
      unitOfMeasure: 'UN',
      unitPriceFob: 200.00,
      totalFob: 4000.00,
      netWeightKg: 300.00,
      grossWeightKg: 330.00
    }
  ]
};

const duaDossier1: DuaCustomsDeclaration = {
  documentType: 'dua_customs_declaration',
  duaNumber: '118-2026-10-004281',
  regimeCode: '10',
  declarationDate: '2026-09-28',
  customsOffice: 'Aduana Marítima del Callao (118)',
  importerRuc: '20601234567',
  importerName: 'Importaciones Andinas SAC',
  currency: 'USD',
  totalFob: 10000.00,
  totalFreight: 1200.00,
  totalInsurance: 150.00,
  totalCif: 11350.00,
  totalAdValorem: 0.00,
  totalIgv: 1816.00,
  totalIpm: 227.00,
  totalPerception: 468.76,
  totalTaxesPayable: 2511.76,
  totalGrossWeightKg: 550.00,
  totalNetWeightKg: 500.00,
  items: [
    {
      itemSequence: 1,
      hsCode: '8471300000',
      commercialDescription: 'Laptops portátiles para procesamiento de datos',
      fobValue: 6000.00,
      freightValue: 480.00,
      insuranceValue: 90.00,
      cifValue: 6570.00,
      netWeightKg: 200.00,
      grossWeightKg: 220.00,
      adValoremRate: 0.00,
      adValoremAmount: 0.00,
      igvRate: 0.16,
      igvAmount: 1051.20,
      ipmRate: 0.02,
      ipmAmount: 131.40,
      perceptionRate: 0.035,
      perceptionAmount: 271.34
    },
    {
      itemSequence: 2,
      hsCode: '8528520000',
      commercialDescription: 'Monitores para ordenadores de pantalla plana',
      fobValue: 4000.00,
      freightValue: 720.00,
      insuranceValue: 60.00,
      cifValue: 4780.00,
      netWeightKg: 300.00,
      grossWeightKg: 330.00,
      adValoremRate: 0.00,
      adValoremAmount: 0.00,
      igvRate: 0.16,
      igvAmount: 764.80,
      ipmRate: 0.02,
      ipmAmount: 95.60,
      perceptionRate: 0.035,
      perceptionAmount: 197.41
    }
  ]
};

const localExpensesDossier1: LocalExpensesReceipt[] = [
  {
    documentType: 'local_expenses_receipt',
    receiptNumber: 'F001-008912',
    issueDate: '2026-09-30',
    supplierRuc: '20509876543',
    supplierName: 'Almacén Aduanero Ransa Comercial',
    concept: 'terminal_storage',
    currency: 'USD',
    subtotalAmount: 300.00,
    taxAmount: 54.00,
    totalAmount: 354.00,
    appliesToShipmentDossier: 'EXP-2026-0042'
  },
  {
    documentType: 'local_expenses_receipt',
    receiptNumber: 'F002-004112',
    issueDate: '2026-09-30',
    supplierRuc: '20104567891',
    supplierName: 'Scharff Logística & Agente de Aduanas',
    concept: 'customs_brokerage',
    currency: 'USD',
    subtotalAmount: 200.00,
    taxAmount: 36.00,
    totalAmount: 236.00,
    appliesToShipmentDossier: 'EXP-2026-0042'
  }
];

// Dossier 2: Advertencia 🟡 (Alemania -> Callao, Maquinaria con Desvío Menor en FOB)
const invoiceDossier2: CommercialInvoiceExtraction = {
  documentType: 'commercial_invoice',
  invoiceNumber: 'INV-DE-2026-44',
  issueDate: '2026-09-10',
  supplierName: 'Siemens Industrial Automation GmbH',
  buyerName: 'Importaciones Andinas SAC',
  buyerTaxId: '20601234567',
  incoterm: 'FOB',
  currency: 'USD',
  totalFobDeclared: 25000.00,
  totalNetWeightKg: 1200.00,
  totalGrossWeightKg: 1350.00,
  items: [
    {
      itemSequence: 1,
      hsCode: '8479899000',
      commercialCode: 'MCH-PUMP-01',
      description: 'Bombas hidráulicas de alta presión industrial',
      quantity: 5,
      unitOfMeasure: 'UN',
      unitPriceFob: 5000.00,
      totalFob: 25000.00,
      netWeightKg: 1200.00,
      grossWeightKg: 1350.00
    }
  ]
};

const duaDossier2: DuaCustomsDeclaration = {
  documentType: 'dua_customs_declaration',
  duaNumber: '118-2026-10-008912',
  regimeCode: '10',
  declarationDate: '2026-09-25',
  customsOffice: 'Aduana Marítima del Callao (118)',
  importerRuc: '20601234567',
  importerName: 'Importaciones Andinas SAC',
  currency: 'USD',
  totalFob: 24995.00, // $5.00 variance (Yellow)
  totalFreight: 2800.00,
  totalInsurance: 320.00,
  totalCif: 28115.00,
  totalAdValorem: 1686.90, // 6%
  totalIgv: 4768.30,
  totalIpm: 596.04,
  totalPerception: 1230.82,
  totalTaxesPayable: 8282.06,
  totalGrossWeightKg: 1350.00,
  totalNetWeightKg: 1200.00,
  items: [
    {
      itemSequence: 1,
      hsCode: '8479899000',
      commercialDescription: 'Aparatos mecánicos con función propia',
      fobValue: 24995.00,
      freightValue: 2800.00,
      insuranceValue: 320.00,
      cifValue: 28115.00,
      netWeightKg: 1200.00,
      grossWeightKg: 1350.00,
      adValoremRate: 0.06,
      adValoremAmount: 1686.90,
      igvRate: 0.16,
      igvAmount: 4768.30,
      ipmRate: 0.02,
      ipmAmount: 596.04,
      perceptionRate: 0.035,
      perceptionAmount: 1230.82
    }
  ]
};

// Dossier 3: Alerta Crítica 🔴 (EE.UU. -> Callao, Repuestos con HS Code Erróneo en DUA)
const invoiceDossier3: CommercialInvoiceExtraction = {
  documentType: 'commercial_invoice',
  invoiceNumber: 'INV-US-891002',
  issueDate: '2026-09-18',
  supplierName: 'Honeywell Aerospace Distribution Inc',
  buyerName: 'Importaciones Andinas SAC',
  buyerTaxId: '20601234567',
  incoterm: 'FOB',
  currency: 'USD',
  totalFobDeclared: 18500.00,
  totalNetWeightKg: 350.00,
  totalGrossWeightKg: 400.00,
  items: [
    {
      itemSequence: 1,
      hsCode: '8803300000',
      commercialCode: 'AERO-VALVE-X',
      description: 'Válvulas reguladoras de flujo para turbina',
      quantity: 2,
      unitOfMeasure: 'UN',
      unitPriceFob: 9250.00,
      totalFob: 18500.00,
      netWeightKg: 350.00,
      grossWeightKg: 400.00
    }
  ]
};

const duaDossier3: DuaCustomsDeclaration = {
  documentType: 'dua_customs_declaration',
  duaNumber: '118-2026-10-010534',
  regimeCode: '10',
  declarationDate: '2026-09-29',
  customsOffice: 'Aduana Aérea del Callao (235)',
  importerRuc: '20601234567',
  importerName: 'Importaciones Andinas SAC',
  currency: 'USD',
  totalFob: 18200.00, // $300 variance + HS Mismatch (Red)
  totalFreight: 1900.00,
  totalInsurance: 210.00,
  totalCif: 20310.00,
  totalAdValorem: 1218.60,
  totalIgv: 3444.58,
  totalIpm: 430.57,
  totalPerception: 889.13,
  totalTaxesPayable: 5982.88,
  totalGrossWeightKg: 400.00,
  totalNetWeightKg: 350.00,
  items: [
    {
      itemSequence: 1,
      hsCode: '8481809900', // HS Code diferente al declarado en factura (8803300000)
      commercialDescription: 'Válvulas reductoras no especificadas en otra parte',
      fobValue: 18200.00,
      freightValue: 1900.00,
      insuranceValue: 210.00,
      cifValue: 20310.00,
      netWeightKg: 350.00,
      grossWeightKg: 400.00,
      adValoremRate: 0.06,
      adValoremAmount: 1218.60,
      igvRate: 0.16,
      igvAmount: 3444.58,
      ipmRate: 0.02,
      ipmAmount: 430.57,
      perceptionRate: 0.035,
      perceptionAmount: 889.13
    }
  ]
};

export default function HomePage() {
  const [selectedDossierIndex, setSelectedDossierIndex] = useState<number>(0);
  const [activeViewState, setActiveViewState] = useState<DashboardViewState>('data');

  // Compute reports dynamically via CoreReconciliationEngine
  const dossierReports: ReconciliationReport[] = useMemo(() => {
    const input1: ReconciliationInput = {
      dossierNumber: 'EXP-2026-0042',
      invoice: invoiceDossier1,
      dua: duaDossier1,
      localExpenses: localExpensesDossier1
    };

    const input2: ReconciliationInput = {
      dossierNumber: 'EXP-2026-0089',
      invoice: invoiceDossier2,
      dua: duaDossier2
    };

    const input3: ReconciliationInput = {
      dossierNumber: 'EXP-2026-0105',
      invoice: invoiceDossier3,
      dua: duaDossier3
    };

    return [
      CoreReconciliationEngine.reconcile(input1),
      CoreReconciliationEngine.reconcile(input2),
      CoreReconciliationEngine.reconcile(input3)
    ];
  }, []);

  const currentReport = dossierReports[selectedDossierIndex] ?? dossierReports[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Top Global Navigation Bar (Hidden on Print) */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-500/20">
              LC
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                LogiClear AI
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  B2B SaaS
                </span>
              </span>
              <p className="text-[11px] text-slate-400">Conciliación Aduanera & Landed Cost</p>
            </div>
          </div>

          {/* Quick Expediente Switcher */}
          <div className="hidden md:flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium">
            <span className="px-2 text-slate-500 text-[11px]">Expediente:</span>
            <button
              type="button"
              onClick={() => {
                setSelectedDossierIndex(0);
                setActiveViewState('data');
              }}
              className={`px-3 py-1 rounded-md transition ${
                selectedDossierIndex === 0 && activeViewState === 'data'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              🟢 EXP-0042 (Conforme)
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDossierIndex(1);
                setActiveViewState('data');
              }}
              className={`px-3 py-1 rounded-md transition ${
                selectedDossierIndex === 1 && activeViewState === 'data'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              🟡 EXP-0089 (Desvío FOB)
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDossierIndex(2);
                setActiveViewState('data');
              }}
              className={`px-3 py-1 rounded-md transition ${
                selectedDossierIndex === 2 && activeViewState === 'data'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              🔴 EXP-0105 (HS Mismatch)
            </button>
          </div>

          {/* Tenant Status & Plan */}
          <div className="flex items-center space-x-3 text-xs">
            <div className="hidden sm:block text-right">
              <p className="font-bold text-slate-900 dark:text-white">Importaciones Andinas S.A.C.</p>
              <p className="text-slate-400 text-[11px]">Plan {BILLING_PLANS.enterprise_pro.name}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 flex items-center justify-center font-bold text-xs">
              IA
            </div>
          </div>
        </div>
      </header>

      {/* State Switcher Bar (Interactive Controls - Hidden on Print) */}
      <div className="bg-slate-100/80 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 py-2 print:hidden state-switcher">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-500">Demostración de Estados UI:</span>
            <button
              type="button"
              onClick={() => setActiveViewState('data')}
              className={`px-2.5 py-1 rounded border text-xs font-medium transition ${
                activeViewState === 'data'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              📊 Estado con Datos (Data)
            </button>
            <button
              type="button"
              onClick={() => setActiveViewState('loading')}
              className={`px-2.5 py-1 rounded border text-xs font-medium transition ${
                activeViewState === 'loading'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              ⏳ Estado Carga (Skeletons)
            </button>
            <button
              type="button"
              onClick={() => setActiveViewState('empty')}
              className={`px-2.5 py-1 rounded border text-xs font-medium transition ${
                activeViewState === 'empty'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              📦 Estado Vacío (Empty)
            </button>
            <button
              type="button"
              onClick={() => setActiveViewState('error')}
              className={`px-2.5 py-1 rounded border text-xs font-medium transition ${
                activeViewState === 'error'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              ⚠️ Estado Error (Retry)
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            SLA de cálculo: <span className="font-bold text-emerald-600">{currentReport.calculationDurationMs} ms</span> • Hash: {currentReport.auditHashSha256.substring(0, 12)}...
          </div>
        </div>
      </div>

      {/* Main Interactive Executive Dashboard */}
      <main className="flex-1 py-8 print:py-0 print:m-0">
        <ExecutiveDashboard
          initialState={activeViewState}
          initialReport={currentReport}
          onRetry={() => setActiveViewState('data')}
        />
      </main>

      {/* Footer (Hidden on Print) */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-400 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 LogiClear AI. Plataforma B2B Enterprise — Conciliación de Importaciones & Landed Cost Determinista.</p>
          <p className="font-mono text-[11px]">Certificación Enterprise V4.1 • PostgreSQL RLS • Stripe Billing SAQ A</p>
        </div>
      </footer>
    </div>
  );
}
