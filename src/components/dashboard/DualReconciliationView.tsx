import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { ReconciledLineItem, ReconciliationSummary } from '@/lib/engine/core_reconciliation_engine';

export interface DualReconciliationViewProps {
  summary: ReconciliationSummary;
  items: ReconciledLineItem[];
  dossierNumber: string;
}

export const DualReconciliationView: React.FC<DualReconciliationViewProps> = ({
  summary,
  items,
  dossierNumber
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(val);
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Vista de Conciliación Dual 1:1
            </h3>
            <Badge variant={summary.overallSeverity}>
              {summary.overallSeverity === 'green'
                ? 'Conforme (0 Discrepancias)'
                : summary.overallSeverity === 'yellow'
                ? `Advertencia (${summary.warningIssuesCount} diferencias menores)`
                : `Alerta Crítica (${summary.criticalIssuesCount} desvíos materiales)`}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Expediente: <span className="font-mono font-semibold">{dossierNumber}</span> • Comparativa entre Origen y Autoridad Aduanera
          </p>
        </div>

        <div className="flex items-center space-x-6 text-sm">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Varianza FOB Total</p>
            <p className={`text-base font-bold font-mono ${
              Math.abs(summary.fobVariance) <= 0.01 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {summary.fobVariance > 0 ? `+${formatCurrency(summary.fobVariance)}` : formatCurrency(summary.fobVariance)}
              <span className="text-xs font-normal text-slate-500 ml-1">
                ({summary.fobVariancePercentage.toFixed(2)}%)
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Landed Cost Calculado</p>
            <p className="text-base font-bold font-mono text-slate-900 dark:text-white">
              {formatCurrency(summary.totalLandedCost)}
            </p>
          </div>
        </div>
      </div>

      {/* Side-by-side Macro Comparison Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Commercial Invoice (Origen) */}
        <div className="p-4 rounded-lg bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center space-x-1.5">
              <span>🌐</span>
              <span>1. Factura Comercial (Origen)</span>
            </span>
            <Badge variant="blue">Documento Proveedor</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-slate-500">Total FOB Facturado</p>
              <p className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(summary.invoiceTotalFob)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Items Declarados</p>
              <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">{items.length} partidas</p>
            </div>
          </div>
        </div>

        {/* Right Column: DUA Aduanera (Destino) */}
        <div className="p-4 rounded-lg bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center space-x-1.5">
              <span>🏛️</span>
              <span>2. Declaración Aduanera (DUA / DAM)</span>
            </span>
            <Badge variant="neutral">Liquidación Oficial</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-slate-500">Total FOB Liquidado</p>
              <p className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(summary.duaTotalFob)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">CIF / Flete + Seguro</p>
              <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {formatCurrency(summary.totalFreight + summary.totalInsurance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Partida por Partida 1:1 Comparative Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-3">Seq</th>
              <th className="py-3 px-3">Partida Factura</th>
              <th className="py-3 px-3">Partida DUA</th>
              <th className="py-3 px-3">FOB Factura</th>
              <th className="py-3 px-3">FOB DUA</th>
              <th className="py-3 px-3">Diferencia FOB</th>
              <th className="py-3 px-3">Flete Asig.</th>
              <th className="py-3 px-3">Seguro Asig.</th>
              <th className="py-3 px-3 text-center">Estado Cotejo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
            {items.map(it => {
              const hasDiff = Math.abs(it.fobDiscrepancy) > 0.01;
              return (
                <tr
                  key={it.itemSequence}
                  className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                    it.itemSeverity === 'red' ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">#{it.itemSequence}</td>
                  <td className="py-2.5 px-3 text-slate-900 dark:text-white">{it.invoiceHsCode}</td>
                  <td className="py-2.5 px-3">
                    <span className={it.hsCodeMatches ? 'text-slate-700 dark:text-slate-300' : 'text-rose-600 font-bold'}>
                      {it.duaHsCode}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">{formatCurrency(it.invoiceTotalFob)}</td>
                  <td className="py-2.5 px-3">{formatCurrency(it.duaTotalFob)}</td>
                  <td className="py-2.5 px-3">
                    <span className={hasDiff ? 'text-rose-600 font-bold' : 'text-emerald-600'}>
                      {it.fobDiscrepancy > 0 ? `+${it.fobDiscrepancy.toFixed(2)}` : it.fobDiscrepancy.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">{formatCurrency(it.proratedFreight)}</td>
                  <td className="py-2.5 px-3">{formatCurrency(it.proratedInsurance)}</td>
                  <td className="py-2.5 px-3 text-center">
                    <Badge variant={it.itemSeverity}>
                      {it.itemSeverity.toUpperCase()}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
