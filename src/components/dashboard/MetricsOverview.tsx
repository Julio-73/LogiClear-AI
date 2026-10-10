import React from 'react';
import { ReconciliationSummary } from '@/lib/engine/core_reconciliation_engine';

export interface MetricsOverviewProps {
  summary: ReconciliationSummary;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ summary }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(val);
  };

  const cards = [
    {
      title: 'Landed Cost Capitalizable',
      value: formatCurrency(summary.totalLandedCost),
      subtitle: `FOB: ${formatCurrency(summary.invoiceTotalFob)}`,
      badge: 'Costo Inventario',
      color: 'border-l-indigo-500'
    },
    {
      title: 'Tributos & Percepciones',
      value: formatCurrency(summary.totalAdValorem + summary.totalIgv + summary.totalIpm + summary.totalPerception),
      subtitle: `Ad-Valorem: ${formatCurrency(summary.totalAdValorem)} • Percepción: ${formatCurrency(summary.totalPerception)}`,
      badge: 'Desembolso Aduanas',
      color: 'border-l-purple-500'
    },
    {
      title: 'Discrepancia Neta Detectada',
      value: formatCurrency(Math.abs(summary.fobVariance)),
      subtitle: summary.fobVariance === 0 ? 'Cero desvío' : `${summary.fobVariancePercentage.toFixed(2)}% de variación`,
      badge: Math.abs(summary.fobVariance) <= 0.01 ? 'Auditoría 100% OK' : 'Desvío en Auditoría',
      color: Math.abs(summary.fobVariance) <= 0.01 ? 'border-l-emerald-500' : 'border-l-rose-500'
    },
    {
      title: 'Flujo de Caja Total (Cash Outflow)',
      value: formatCurrency(summary.totalCashOutflow),
      subtitle: `Gastos locales: ${formatCurrency(summary.totalLocalExpenses)}`,
      badge: 'Liquidación Total',
      color: 'border-l-blue-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full print:hidden">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm border-l-4 ${card.color} space-y-2`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{card.title}</span>
            <span className="font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[10px]">
              {card.badge}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {card.value}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {card.subtitle}
          </p>
        </div>
      ))}
    </div>
  );
};
