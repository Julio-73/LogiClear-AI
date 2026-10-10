import React, { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { ReconciledLineItem } from '@/lib/engine/core_reconciliation_engine';

export interface LandedCostTableProps {
  items: ReconciledLineItem[];
}

export const LandedCostTable: React.FC<LandedCostTableProps> = ({ items }) => {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const formatCurrency = (val: number, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(val);
  };

  const toggleRow = (seq: number) => {
    setExpandedRow(prev => (prev === seq ? null : seq));
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4 print:hidden print-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Desglose de Landed Cost (Costo Puesto en Almacén)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Prorrateo determinista por peso y valor. Haz clic en una partida para auditar tributos aduaneros y percepciones.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span className="text-slate-600 dark:text-slate-400">Conforme</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span className="text-slate-600 dark:text-slate-400">Tolerable</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span className="text-slate-600 dark:text-slate-400">Crítico</span>
          </span>
        </div>
      </div>

      <div>
        <p className="block sm:hidden text-[11px] text-slate-400 mb-1">
          ↔ Desliza la tabla horizontalmente para ver todas las columnas
        </p>
        <div className="w-full overflow-x-auto overscroll-x-contain rounded-lg border border-slate-200 dark:border-slate-800 print:overflow-visible">
          <table className="w-full text-left text-xs whitespace-nowrap sm:whitespace-normal">
            <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3">Item / Partida</th>
                <th className="py-3 px-3">Descripción</th>
                <th className="py-3 px-3 text-right">Cantidad</th>
                <th className="py-3 px-3 text-right">FOB Total</th>
                <th className="py-3 px-3 text-right">Flete + Seguro</th>
                <th className="py-3 px-3 text-right">Ad-Valorem</th>
                <th className="py-3 px-3 text-right">Gastos Locales</th>
                <th className="py-3 px-3 text-right font-bold text-indigo-700 dark:text-indigo-400">Landed Total</th>
                <th className="py-3 px-3 text-right font-bold text-indigo-700 dark:text-indigo-400">Costo Unitario</th>
                <th className="py-3 px-3 text-center">Auditoría</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {items.map(it => {
                const isExpanded = expandedRow === it.itemSequence;
                return (
                  <React.Fragment key={it.itemSequence}>
                    <tr
                      onClick={() => toggleRow(it.itemSequence)}
                      className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                        #{it.itemSequence} • {it.invoiceHsCode}
                      </td>
                      <td className="py-3 px-3 font-sans truncate max-w-xs text-slate-700 dark:text-slate-300">
                        {it.commercialDescription}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300">
                        {it.quantity} {it.unitOfMeasure}
                      </td>
                      <td className="py-3 px-3 text-right">{formatCurrency(it.invoiceTotalFob)}</td>
                      <td className="py-3 px-3 text-right">
                        {formatCurrency(it.proratedFreight + it.proratedInsurance)}
                      </td>
                      <td className="py-3 px-3 text-right">{formatCurrency(it.adValoremAmount)}</td>
                      <td className="py-3 px-3 text-right">{formatCurrency(it.proratedLocalExpenses)}</td>
                      <td className="py-3 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(it.capitalizableLandedCostTotal)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                        {formatCurrency(it.landedCostPerUnit, 4)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant={it.itemSeverity}>
                          {it.itemSeverity === 'green' ? 'OK' : it.itemSeverity.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>

                    {/* Expanded Audit Sub-Row */}
                    {isExpanded && (
                      <tr className="bg-slate-50/60 dark:bg-slate-800/30">
                        <td colSpan={10} className="p-4 border-t border-b border-slate-200/60 dark:border-slate-700/60 font-sans">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs whitespace-normal">
                            <div className="space-y-1">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">Tributos Fiscales Deducibles:</span>
                              <p className="font-mono text-slate-600 dark:text-slate-400">
                                IGV (16%): {formatCurrency(it.igvAmount)}
                              </p>
                              <p className="font-mono text-slate-600 dark:text-slate-400">
                                IPM (2%): {formatCurrency(it.ipmAmount)}
                              </p>
                              <p className="font-mono text-slate-600 dark:text-slate-400">
                                Percepción ({(it.perceptionRate * 100).toFixed(1)}%): {formatCurrency(it.perceptionAmount)}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">Factores de Prorrateo:</span>
                              <p className="font-mono text-slate-600 dark:text-slate-400">
                                Peso Neto: {it.netWeightKg} kg ({(it.weightProrationFactor * 100).toFixed(4)}%)
                              </p>
                              <p className="font-mono text-slate-600 dark:text-slate-400">
                                Valor FOB: {(it.valueProrationFactor * 100).toFixed(4)}% del total
                              </p>
                              <p className="font-mono text-slate-600 dark:text-slate-400">
                                Base Imponible CIF: {formatCurrency(it.cifValue)}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">Flujo de Caja Total (Cash Outflow):</span>
                              <p className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                                {formatCurrency(it.totalCashOutflow)}
                              </p>
                              <p className="text-slate-500 text-[11px]">
                                Incluye capitalizable + tributos y percepciones SUNAT.
                              </p>
                            </div>

                            <div className="space-y-1">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">Diagnóstico de Discrepancia:</span>
                              {it.discrepancyReasons.length === 0 ? (
                                <p className="text-emerald-600 font-semibold">Sin discrepancias matemáticas ni de nomenclatura.</p>
                              ) : (
                                <ul className="list-disc list-inside text-rose-600 space-y-0.5">
                                  {it.discrepancyReasons.map((r, i) => (
                                    <li key={i}>{r}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
