import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { DocumentType } from '@/lib/genai/extraction_schemas';

export interface UploadedFileItem {
  id: string;
  name: string;
  size: number;
  type: DocumentType;
  status: 'ready' | 'uploading' | 'completed' | 'error';
  rawFile: File;
}

export interface DossierFolderUploadProps {
  onFilesSubmitted: (files: UploadedFileItem[]) => void;
  disabled?: boolean;
}

export const DossierFolderUpload: React.FC<DossierFolderUploadProps> = ({
  onFilesSubmitted,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileList, setFileList] = useState<UploadedFileItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detectDocumentType = (fileName: string): DocumentType => {
    const lower = fileName.toLowerCase();
    if (lower.includes('factura') || lower.includes('invoice') || lower.includes('comercial')) {
      return 'commercial_invoice';
    }
    if (lower.includes('bl') || lower.includes('lading') || lower.includes('conocimiento') || lower.includes('awb')) {
      return 'bill_of_lading';
    }
    if (lower.includes('dua') || lower.includes('dam') || lower.includes('declaracion') || lower.includes('aduan')) {
      return 'dua_customs_declaration';
    }
    return 'local_expenses_receipt';
  };

  const processFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: UploadedFileItem[] = Array.from(files).map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: file.name,
      size: file.size,
      type: detectDocumentType(file.name),
      status: 'ready',
      rawFile: file
    }));

    setFileList(prev => [...prev, ...newItems]);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };

  const handleRemoveFile = (id: string) => {
    setFileList(prev => prev.filter(f => f.id !== id));
  };

  const handleUpdateType = (id: string, newType: DocumentType) => {
    setFileList(prev =>
      prev.map(f => (f.id === id ? { ...f, type: newType } : f))
    );
  };

  const handleSubmit = () => {
    if (fileList.length > 0) {
      onFilesSubmitted(fileList);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Carga de Expediente de Importación
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Arrastra la carpeta o selecciona la Factura Comercial, BL, DUA y comprobantes de gastos locales.
          </p>
        </div>
        <span className="text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-semibold px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
          OCR Multimodal Zero-Hallucination
        </span>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/20'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
          disabled={disabled}
        />
        <div className="flex flex-col items-center justify-center space-y-2">
          <svg className="w-10 h-10 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <div className="text-sm text-slate-700 dark:text-slate-300 font-medium">
            <span className="text-indigo-600 dark:text-indigo-400 hover:underline">Haz clic para buscar</span> o arrastra tus archivos aquí
          </div>
          <p className="text-xs text-slate-400">PDF, XML, JSON, TIFF o escaneos de alta resolución (máx. 50 MB por archivo)</p>
        </div>
      </div>

      {fileList.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex justify-between items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
            <span>Documentos Detectados ({fileList.length})</span>
            <button
              type="button"
              onClick={() => setFileList([])}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium"
            >
              Limpiar selección
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            {fileList.map(item => (
              <div key={item.id} className="p-3 flex items-center justify-between bg-white dark:bg-slate-900 text-sm">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <span className="text-slate-400">📄</span>
                  <div className="truncate">
                    <p className="font-medium text-slate-900 dark:text-white truncate">{item.name}</p>
                    <p className="text-xs text-slate-400">{(item.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <select
                    value={item.type}
                    onChange={e => handleUpdateType(item.id, e.target.value as DocumentType)}
                    className="text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-1 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="commercial_invoice">Factura Comercial</option>
                    <option value="bill_of_lading">Bill of Lading (BL)</option>
                    <option value="dua_customs_declaration">Declaración DUA / DAM</option>
                    <option value="local_expenses_receipt">Gastos Locales</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleRemoveFile(item.id)}
                    className="text-slate-400 hover:text-rose-500 p-1"
                    title="Eliminar archivo"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={disabled || fileList.length === 0}
              className="px-5 py-2.5 rounded-lg font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition shadow-sm"
            >
              Iniciar Procesamiento y Extracción IA
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
