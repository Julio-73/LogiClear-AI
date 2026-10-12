import React, { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { MetricsOverview } from './MetricsOverview';
import { DossierFolderUpload, UploadedFileItem } from './DossierFolderUpload';
import { DualReconciliationView } from './DualReconciliationView';
import { LandedCostTable } from './LandedCostTable';
import { FormalConciliationActPrintView } from '@/components/print/FormalConciliationActPrintView';
import { ReconciliationReport } from '@/lib/engine/core_reconciliation_engine';

export type DashboardViewState = 'loading' | 'empty' | 'error' | 'data';

export interface ToastNotice {
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface ExecutiveDashboardProps {
  initialState?: DashboardViewState;
  initialReport?: ReconciliationReport | null;
  errorMessage?: string;
  onRetry?: () => void;
  onProcessFiles?: (files: UploadedFileItem[]) => Promise<void>;
  onReportUpdated?: (report: ReconciliationReport) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  initialState = 'data',
  initialReport = null,
  errorMessage = 'Ocurrió un error inesperado al procesar el expediente aduanero.',
  onRetry,
  onProcessFiles,
  onReportUpdated
}) => {
  const [viewState, setViewState] = useState<DashboardViewState>(initialState);
  const [report, setReport] = useState<ReconciliationReport | null>(initialReport);
  const [errorText, setErrorText] = useState<string>(errorMessage);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastNotice | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(val);
  };

  // Sync internal report when initialReport changes from parent selector
  useEffect(() => {
    if (initialReport) {
      setReport(initialReport);
    }
  }, [initialReport]);

  useEffect(() => {
    setViewState(initialState);
  }, [initialState]);

  // Auto-dismiss Toast after 4.5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleRetry = () => {
    setViewState('loading');
    if (onRetry) {
      onRetry();
    } else {
      setTimeout(() => {
        setViewState(report ? 'data' : 'empty');
      }, 500);
    }
  };

  /**
   * Resilient Extraction Handler:
   * Dispatches files to /api/extract, handles serverless fallbacks gracefully,
   * reactively updates state across KPIs and tables, and smooth-scrolls on mobile.
   */
  const handleFilesSubmitted = async (files: UploadedFileItem[]) => {
    setIsExtracting(true);
    try {
      if (onProcessFiles) {
        await onProcessFiles(files);
      } else {
        // Build resilient FormData
        const formData = new FormData();
        files.forEach(f => {
          formData.append('files', f.rawFile);
          formData.append('documentTypes', f.type);
        });

        const res = await fetch('/api/extract', {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          throw new Error(`Servidor respondió con código ${res.status}`);
        }

        const payload = await res.json();

        if (payload.success && payload.report) {
          // Reactively mutate local and parent state
          setReport(payload.report);
          setViewState('data');

          if (onReportUpdated) {
            onReportUpdated(payload.report);
          }

          setToast({
            type: 'success',
            message: payload.message || 'Expediente procesado y conciliado con integridad matemática verificada.'
          });

          // Trigger smooth scroll on mobile & desktop to reveal new calculations
          setTimeout(() => {
            const resultsSection = document.getElementById('reconciliation-results-section');
            if (resultsSection) {
              resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 150);
        } else {
          throw new Error(payload.message || 'No se pudo completar la extracción del expediente.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con el motor de extracción.';
      setToast({
        type: 'error',
        message: msg
      });
      // Prevent UI freeze
      if (!report) {
        setErrorText(msg);
        setViewState('error');
      }
    } finally {
      setIsExtracting(false);
    }
  };

  // ============================================================================
  // 1. STATE: LOADING (Skeletons)
  // ============================================================================
  if (viewState === 'loading') {
    return (
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 pb-24 sm:pb-8 space-y-6 print:hidden print-hidden">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>

        {/* Metric Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>

        {/* Dual View Skeleton */}
        <Skeleton className="h-72 rounded-xl" />

        {/* Table Skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. STATE: ERROR (Retry Screen)
  // ============================================================================
  if (viewState === 'error') {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 sm:p-12 pb-24 sm:pb-8 text-center my-6 sm:my-12 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-2xl shadow-sm space-y-5 print:hidden print-hidden">
        <div className="w-16 h-16 mx-auto bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-full flex items-center justify-center text-3xl">
          ⚠️
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Fallo en el Procesamiento del Expediente
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">
            {errorText}
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={handleRetry}
            className="min-h-[44px] px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 transition shadow-sm"
          >
            Reintentar Conciliación
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 3. STATE: EMPTY (No dossier loaded yet)
  // ============================================================================
  if (viewState === 'empty' || !report) {
    return (
      <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 pb-24 sm:pb-8 space-y-8 print:hidden print-hidden">
        {/* Floating Toast Notification */}
        {toast && (
          <div
            role="status"
            className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 p-4 rounded-xl shadow-xl border flex items-start space-x-3 transition-all duration-300 ${
              toast.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-700'
                : toast.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : 'bg-indigo-900 text-white border-indigo-700'
            }`}
          >
            <span className="text-lg shrink-0 mt-0.5">
              {toast.type === 'success' ? '✅' : toast.type === 'error' ? '⚠️' : 'ℹ️'}
            </span>
            <div className="flex-1 text-xs">
              <p className="font-bold text-sm">
                {toast.type === 'success' ? 'Extracción Completada' : toast.type === 'error' ? 'Aviso' : 'Información'}
              </p>
              <p className="mt-0.5 opacity-90 leading-relaxed">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-white/70 hover:text-white p-1 text-xs shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        <div className="text-center py-8 sm:py-10 space-y-3">
          <span className="text-4xl">📦</span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Bienvenido a LogiClear AI
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-xs sm:text-sm">
            Aún no hay ningún expediente aduanero activo en esta sesión. Sube una carpeta con la Factura Comercial y la DUA para comenzar el cotejo automatizado.
          </p>
        </div>

        <DossierFolderUpload
          onFilesSubmitted={handleFilesSubmitted}
          isExtracting={isExtracting}
        />
      </div>
    );
  }

  // ============================================================================
  // 4. STATE: DATA (Complete Executive Dashboard & Print View)
  // ============================================================================
  return (
    <>
      {/* Floating Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 p-4 rounded-xl shadow-xl border flex items-start space-x-3 transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-white border-emerald-700 shadow-emerald-950/40'
              : toast.type === 'error'
              ? 'bg-rose-950 text-white border-rose-700 shadow-rose-950/40'
              : 'bg-indigo-950 text-white border-indigo-700 shadow-indigo-950/40'
          }`}
        >
          <span className="text-xl shrink-0 mt-0.5">
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '⚠️' : 'ℹ️'}
          </span>
          <div className="flex-1 text-xs">
            <p className="font-bold text-sm">
              {toast.type === 'success' ? 'Expediente Conciliado' : toast.type === 'error' ? 'Aviso de Error' : 'Notificación'}
            </p>
            <p className="mt-0.5 opacity-90 leading-relaxed">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-white/70 hover:text-white p-1 text-xs shrink-0"
            title="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      )}

      {/* 4.A VISTA INTERACTIVA EN PANTALLA (OCULTA AL IMPRIMIR) */}
      <div
        id="screen-dashboard-container"
        className="w-full max-w-7xl mx-auto p-4 sm:p-6 pb-24 sm:pb-8 space-y-6 print:hidden print-hidden interactive-dashboard"
      >
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                LogiClear AI
              </h1>
              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                Auditoría Determinista v1.0
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate max-w-md">
              Hash Criptográfico de Auditoría: <span className="font-mono">{report.auditHashSha256.substring(0, 24)}...</span>
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => setViewState('empty')}
              className="min-h-[44px] px-3 sm:px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center"
            >
              Nuevo Expediente
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-[44px] px-3 sm:px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 transition shadow-sm flex items-center space-x-1.5"
            >
              <span>📄</span>
              <span className="hidden sm:inline">Exportar</span> Acta de Conciliación
            </button>
          </div>
        </div>

        {/* Ingestion Drawer with Active Extraction Feedback */}
        <div className="print:hidden">
          <DossierFolderUpload
            onFilesSubmitted={handleFilesSubmitted}
            isExtracting={isExtracting}
          />
        </div>

        {/* Results Section with ID for Auto-Scroll Target */}
        <div id="reconciliation-results-section" className="space-y-6 pt-2">
          {/* 1. Executive Metrics Overview */}
          <MetricsOverview summary={report.summary} />

          {/* 2. Dual 1:1 Comparative Reconciliation View */}
          <DualReconciliationView
            summary={report.summary}
            items={report.items}
            dossierNumber={report.dossierNumber}
          />

          {/* 3. Full Landed Cost Breakdown Table */}
          <LandedCostTable items={report.items} />
        </div>
      </div>

      {/* 4.B BARRA FLOTANTE INFERIOR RESUMEN MÓVIL (VISIBLE SOLO EN MÓVIL < 640PX, OCULTA EN PRINT) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 sm:hidden flex items-center justify-between shadow-lg print:hidden print-hidden">
        <div className="flex items-center space-x-2">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              report.summary.overallSeverity === 'green'
                ? 'bg-emerald-500'
                : report.summary.overallSeverity === 'yellow'
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
          />
          <div className="text-left">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              {report.summary.overallSeverity === 'green'
                ? '0 Discrepancias'
                : `${report.summary.criticalIssuesCount + report.summary.warningIssuesCount} Discrepancias`}
            </p>
            <p
              className={`text-xs font-bold font-mono ${
                Math.abs(report.summary.fobVariance) <= 0.01 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              Var: {report.summary.fobVariance > 0 ? `+${formatCurrency(report.summary.fobVariance)}` : formatCurrency(report.summary.fobVariance)}
            </p>
          </div>
        </div>

        <div className="text-right flex items-center space-x-3">
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              Landed Total
            </p>
            <p className="text-xs font-bold font-mono text-slate-900 dark:text-white">
              {formatCurrency(report.summary.totalLandedCost)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[44px] min-w-[44px] p-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 active:bg-indigo-800 shadow-sm flex items-center justify-center"
            title="Exportar Acta de Conciliación"
          >
            📄
          </button>
        </div>
      </div>

      {/* 4.C VISTA DE IMPRESIÓN FORMAL CERTIFICADA (VISIBLE ÚNICAMENTE EN PRINT / PDF) */}
      <FormalConciliationActPrintView
        report={report}
        companyName="Importaciones Andinas S.A.C."
        companyRuc="20601234567"
        customsAgentName="Scharff Logística & Agente de Aduanas S.A."
        customsAgentRegister="SUNAT-AG-04112"
      />
    </>
  );
};
