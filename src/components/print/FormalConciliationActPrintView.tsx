import React from 'react';
import { ReconciliationReport } from '@/lib/engine/core_reconciliation_engine';

export interface FormalConciliationActPrintViewProps {
  report: ReconciliationReport;
  companyName?: string;
  companyRuc?: string;
  customsAgentName?: string;
  customsAgentRegister?: string;
}

export const FormalConciliationActPrintView: React.FC<FormalConciliationActPrintViewProps> = ({
  report,
  companyName = 'Importaciones Andinas S.A.C.',
  companyRuc = '20601234567',
  customsAgentName = 'Scharff Logística & Agente de Aduanas S.A.',
  customsAgentRegister = 'SUNAT-AG-04112'
}) => {
  const { summary, items } = report;

  const formatCurrency = (val: number, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(val);
  };

  const formattedDate = new Date(report.reconciledAt).toLocaleString('es-PE', {
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  const getStatusBadge = () => {
    switch (summary.overallSeverity) {
      case 'green':
        return {
          label: 'CONFORME — 0 DISCREPANCIAS MATERIALES',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300'
        };
      case 'yellow':
        return {
          label: `ADVERTENCIA — ${summary.warningIssuesCount} DESVÍOS MENORES TOLERABLES`,
          bg: 'bg-amber-50 text-amber-800 border-amber-300'
        };
      case 'red':
        return {
          label: `ALERTA CRÍTICA — ${summary.criticalIssuesCount} DISCREPANCIAS MATERIALES / HS CODE`,
          bg: 'bg-rose-50 text-rose-800 border-rose-300'
        };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="hidden print:block w-full max-w-[210mm] mx-auto text-slate-900 bg-white font-sans text-[11px] leading-relaxed p-2">
      {/* 1. ENCABEZADO OFICIAL */}
      <div className="border-b-2 border-slate-900 pb-3 mb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 border-2 border-slate-900 rounded-md flex items-center justify-center font-black text-base text-slate-900">
              LC
            </div>
            <div>
              <p className="text-[10px] tracking-widest uppercase font-bold text-slate-600">
                LogiClear AI • Plataforma B2B de Auditoría Aduanera
              </p>
              <h1 className="text-base font-black tracking-tight uppercase text-slate-900">
                Acta Oficial de Conciliación Aduanera y Auditoría de Landed Cost
              </h1>
              <p className="text-[10px] text-slate-600">
                Documento Certificado de Cotejo 1:1, Liquidación Tributaria y Prorrateo de Costos en Almacén
              </p>
            </div>
          </div>

          <div className="text-right text-[10px]">
            <p className="font-mono font-bold text-slate-900">{report.reconciliationId}</p>
            <p className="text-slate-500">Emisión: {formattedDate}</p>
          </div>
        </div>
      </div>

      {/* 2. METADATOS DEL EXPEDIENTE */}
      <div className="border border-slate-300 rounded-md p-3 mb-4 bg-slate-50/50">
        <div className="grid grid-cols-3 gap-3 text-[10px]">
          <div>
            <span className="text-slate-500 block uppercase tracking-wider font-semibold">Importador / Empresa:</span>
            <span className="font-bold text-slate-900 block">{companyName}</span>
            <span className="text-slate-600">RUC: {companyRuc}</span>
          </div>

          <div>
            <span className="text-slate-500 block uppercase tracking-wider font-semibold">Identificación Aduanera:</span>
            <span className="font-bold text-slate-900 block">Expediente: {report.dossierNumber}</span>
            <span className="text-slate-600">Régimen: Importación para el Consumo (10)</span>
          </div>

          <div>
            <span className="text-slate-500 block uppercase tracking-wider font-semibold">Estado de Conformidad:</span>
            <span className={`inline-block px-2 py-0.5 mt-0.5 rounded border text-[9px] font-bold ${statusBadge.bg}`}>
              {statusBadge.label}
            </span>
          </div>
        </div>
      </div>

      {/* 3. RESUMEN FINANCIERO Y LIQUIDACIÓN ADUANERA */}
      <div className="border border-slate-300 rounded-md overflow-hidden mb-4 print-avoid-break">
        <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 font-bold text-[10px] uppercase text-slate-800 tracking-wider">
          Resumen Financiero de Liquidación y Cotejo
        </div>
        <table className="w-full text-[10px]">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="py-1.5 px-3 font-medium text-slate-600 w-1/4">Total FOB Declarado (Factura):</td>
              <td className="py-1.5 px-3 font-mono font-bold text-slate-900 w-1/4">{formatCurrency(summary.invoiceTotalFob)}</td>
              <td className="py-1.5 px-3 font-medium text-slate-600 w-1/4">Flete Internacional (DUA):</td>
              <td className="py-1.5 px-3 font-mono font-bold text-slate-900 w-1/4">{formatCurrency(summary.totalFreight)}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-1.5 px-3 font-medium text-slate-600">Total FOB Liquidado (DUA):</td>
              <td className="py-1.5 px-3 font-mono font-bold text-slate-900">{formatCurrency(summary.duaTotalFob)}</td>
              <td className="py-1.5 px-3 font-medium text-slate-600">Seguro Internacional (DUA):</td>
              <td className="py-1.5 px-3 font-mono font-bold text-slate-900">{formatCurrency(summary.totalInsurance)}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-1.5 px-3 font-medium text-slate-600">Varianza FOB Neta:</td>
              <td className={`py-1.5 px-3 font-mono font-bold ${
                Math.abs(summary.fobVariance) <= 0.01 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {summary.fobVariance > 0 ? `+${formatCurrency(summary.fobVariance)}` : formatCurrency(summary.fobVariance)} ({summary.fobVariancePercentage.toFixed(2)}%)
              </td>
              <td className="py-1.5 px-3 font-medium text-slate-600">Base Imponible en Aduanas (CIF):</td>
              <td className="py-1.5 px-3 font-mono font-bold text-slate-900">{formatCurrency(summary.totalCif)}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-1.5 px-3 font-medium text-slate-600">Derechos Arancelarios (Ad-Valorem):</td>
              <td className="py-1.5 px-3 font-mono font-bold text-slate-900">{formatCurrency(summary.totalAdValorem)}</td>
              <td className="py-1.5 px-3 font-medium text-slate-600">Gastos Locales de Despacho:</td>
              <td className="py-1.5 px-3 font-mono font-bold text-slate-900">{formatCurrency(summary.totalLocalExpenses)}</td>
            </tr>
            <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold">
              <td className="py-1.5 px-3 text-slate-700">Tributos Deducibles (IGV + IPM + Percepción):</td>
              <td className="py-1.5 px-3 font-mono text-slate-800">
                {formatCurrency(summary.totalIgv + summary.totalIpm + summary.totalPerception)}
              </td>
              <td className="py-1.5 px-3 text-indigo-900 font-bold uppercase">Landed Cost Capitalizable:</td>
              <td className="py-1.5 px-3 font-mono text-indigo-900 font-black text-[11px]">{formatCurrency(summary.totalLandedCost)}</td>
            </tr>
            <tr className="bg-slate-100 font-bold">
              <td colSpan={2} className="py-1.5 px-3 text-slate-600">
                Partidas Arancelarias Auditadas: {items.length} partidas
              </td>
              <td className="py-1.5 px-3 text-slate-900 font-black uppercase">Flujo de Caja Total (Cash Outflow):</td>
              <td className="py-1.5 px-3 font-mono text-slate-900 font-black text-[11px]">{formatCurrency(summary.totalCashOutflow)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. TABLA DETALLADA POR PARTIDA (FULL WIDTH PARA A4) */}
      <div className="border border-slate-300 rounded-md overflow-hidden mb-4 print-avoid-break">
        <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 font-bold text-[10px] uppercase text-slate-800 tracking-wider">
          Desglose de Costo en Almacén por Partida Arancelaria (Prorrateo Determinista)
        </div>
        <table className="w-full text-left text-[9px] border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-300 text-slate-700 font-bold uppercase">
              <th className="py-1.5 px-1.5 text-center w-8">Seq</th>
              <th className="py-1.5 px-2 w-20">Partida Fact.</th>
              <th className="py-1.5 px-2 w-20">Partida DUA</th>
              <th className="py-1.5 px-2">Descripción Mercancía</th>
              <th className="py-1.5 px-1.5 text-right w-14">Cant.</th>
              <th className="py-1.5 px-2 text-right w-16">FOB Fact.</th>
              <th className="py-1.5 px-2 text-right w-16">Flete/Seg.</th>
              <th className="py-1.5 px-2 text-right w-16">Base CIF</th>
              <th className="py-1.5 px-1.5 text-right w-12">Ad-Val</th>
              <th className="py-1.5 px-2 text-right w-14">Gastos Loc.</th>
              <th className="py-1.5 px-2 text-right w-18 font-bold text-slate-900">Landed Unit.</th>
              <th className="py-1.5 px-2 text-right w-20 font-bold text-slate-900">Landed Total</th>
              <th className="py-1.5 px-1 text-center w-12">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono">
            {items.map(it => (
              <tr key={it.itemSequence} className="align-middle">
                <td className="py-1.5 px-1.5 text-center font-bold text-slate-800">#{it.itemSequence}</td>
                <td className="py-1.5 px-2 text-slate-900 font-semibold">{it.invoiceHsCode}</td>
                <td className={`py-1.5 px-2 ${it.hsCodeMatches ? 'text-slate-800' : 'text-rose-700 font-bold'}`}>
                  {it.duaHsCode}
                </td>
                <td className="py-1.5 px-2 font-sans truncate max-w-[140px] text-slate-700">{it.commercialDescription}</td>
                <td className="py-1.5 px-1.5 text-right text-slate-700">{it.quantity} {it.unitOfMeasure}</td>
                <td className="py-1.5 px-2 text-right">{formatCurrency(it.invoiceTotalFob)}</td>
                <td className="py-1.5 px-2 text-right">{formatCurrency(it.proratedFreight + it.proratedInsurance)}</td>
                <td className="py-1.5 px-2 text-right">{formatCurrency(it.cifValue)}</td>
                <td className="py-1.5 px-1.5 text-right">{formatCurrency(it.adValoremAmount)}</td>
                <td className="py-1.5 px-2 text-right">{formatCurrency(it.proratedLocalExpenses)}</td>
                <td className="py-1.5 px-2 text-right font-bold text-slate-900">{formatCurrency(it.landedCostPerUnit, 2)}</td>
                <td className="py-1.5 px-2 text-right font-bold text-slate-900">{formatCurrency(it.capitalizableLandedCostTotal)}</td>
                <td className="py-1.5 px-1 text-center font-sans font-bold text-[8px]">
                  <span className={`px-1 py-0.5 rounded border ${
                    it.itemSeverity === 'green' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                    it.itemSeverity === 'yellow' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                    'bg-rose-50 text-rose-800 border-rose-300'
                  }`}>
                    {it.itemSeverity.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 5. CERTIFICACIÓN CRIPTOGRÁFICA DE INTEGRIDAD */}
      <div className="border border-slate-300 rounded-md p-3 mb-6 bg-slate-50/70 print-avoid-break">
        <div className="flex items-start justify-between">
          <div className="space-y-1 max-w-[70%]">
            <p className="font-bold text-[10px] text-slate-900 uppercase tracking-wider">
              Certificación de Integridad Matemática y Cumplimiento Normativo
            </p>
            <p className="text-[9px] text-slate-600 leading-normal">
              Se certifica que la presente conciliación y liquidación ha sido ejecutada de forma determinista bajo el Estándar Enterprise V4.1. El prorrateo de flete por peso y seguro/gastos por valor conserva el 100.00% de los totales declarados según las normas de valoración de la OMC y SUNAT.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-semibold">Algoritmo de Validación:</span>
            <span className="font-bold font-mono text-[10px] text-slate-900">SHA-256 (64-HEX)</span>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between font-mono text-[9px]">
          <span className="text-slate-500 font-sans font-bold uppercase">Hash Inmutable de Auditoría:</span>
          <span className="bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-900 font-bold select-all">
            {report.auditHashSha256}
          </span>
        </div>
      </div>

      {/* 6. RECUADROS PARA FIRMAS FORMALES */}
      <div className="grid grid-cols-2 gap-8 pt-4 print-avoid-break">
        {/* Firma 1: Auditor Contable */}
        <div className="border border-slate-300 rounded-md p-4 text-center">
          <div className="h-16 flex items-end justify-center mb-2">
            <div className="w-48 border-b-2 border-slate-800" />
          </div>
          <p className="font-bold text-[10px] text-slate-900 uppercase">
            Auditor Contable / Responsable de Finanzas
          </p>
          <p className="text-[9px] text-slate-600">{companyName}</p>
          <div className="mt-3 text-left text-[8px] text-slate-500 space-y-0.5 border-t border-slate-100 pt-1">
            <p>DNI / Documento de Identidad: ________________________________</p>
            <p>Fecha de Aprobación: ____ / ____ / ________</p>
          </div>
        </div>

        {/* Firma 2: Agente de Aduanas */}
        <div className="border border-slate-300 rounded-md p-4 text-center">
          <div className="h-16 flex items-end justify-center mb-2">
            <div className="w-48 border-b-2 border-slate-800" />
          </div>
          <p className="font-bold text-[10px] text-slate-900 uppercase">
            Agente de Aduanas / Despachador Oficial
          </p>
          <p className="text-[9px] text-slate-600">{customsAgentName}</p>
          <div className="mt-3 text-left text-[8px] text-slate-500 space-y-0.5 border-t border-slate-100 pt-1">
            <p>Registro SUNAT / Carné: {customsAgentRegister}</p>
            <p>Fecha de Visado: ____ / ____ / ________</p>
          </div>
        </div>
      </div>

      {/* Pie de página de impresión */}
      <div className="mt-6 pt-2 border-t border-slate-200 text-center text-[8px] text-slate-400">
        Documento generado automáticamente por LogiClear AI Enterprise B2B SaaS • Validez probatoria tributaria y de costos de inventario.
      </div>
    </div>
  );
};
