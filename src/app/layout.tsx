import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LogiClear AI — Plataforma B2B de Conciliación Aduanera & Landed Cost',
  description: 'Automatización determinista de importaciones, cotejo de declaraciones DUA, facturas comerciales y cálculo de Landed Cost.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full bg-slate-50 dark:bg-slate-950 font-sans">
        {children}
      </body>
    </html>
  );
}
