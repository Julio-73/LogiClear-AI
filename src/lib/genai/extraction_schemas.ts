import { z } from 'zod';

/**
 * LOGICLEAR AI — ZERO-HALLUCINATION EXTRACTION SCHEMAS
 * Standard: Strict Multimodal Zod & JSON Schema Validation
 * Temperature: 0.0 (Deterministic Extraction)
 */

// Supported Incoterms 2020
export const IncotermEnum = z.enum([
  'EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP',
  'FAS', 'FOB', 'CFR', 'CIF'
]);
export type Incoterm = z.infer<typeof IncotermEnum>;

// Currencies
export const CurrencyEnum = z.enum(['USD', 'EUR', 'CNY', 'GBP', 'JPY', 'PEN', 'CAD']);
export type Currency = z.infer<typeof CurrencyEnum>;

// Document Types
export const DocumentTypeEnum = z.enum([
  'commercial_invoice',
  'bill_of_lading',
  'dua_customs_declaration',
  'local_expenses_receipt'
]);
export type DocumentType = z.infer<typeof DocumentTypeEnum>;

// Expense Concepts
export const LocalExpenseConceptEnum = z.enum([
  'terminal_storage',
  'customs_brokerage',
  'local_inland_transport',
  'port_handling_thc',
  'inspection_gate_fee',
  'cargo_insurance'
]);
export type LocalExpenseConcept = z.infer<typeof LocalExpenseConceptEnum>;

// ==============================================================================
// 1. COMMERCIAL INVOICE EXTRACTION SCHEMA
// ==============================================================================
export const CommercialInvoiceItemSchema = z.object({
  itemSequence: z.number().int().positive(),
  hsCode: z.string().regex(/^\d{6,10}$/, 'HS Code must contain between 6 and 10 digits'),
  commercialCode: z.string().min(1).default('N/A'),
  description: z.string().min(2),
  quantity: z.number().positive(),
  unitOfMeasure: z.string().min(1).default('UN'),
  unitPriceFob: z.number().nonnegative(),
  totalFob: z.number().nonnegative(),
  netWeightKg: z.number().nonnegative(),
  grossWeightKg: z.number().nonnegative().optional()
});
export type CommercialInvoiceItem = z.infer<typeof CommercialInvoiceItemSchema>;

export const CommercialInvoiceExtractionSchema = z.object({
  documentType: z.literal('commercial_invoice'),
  invoiceNumber: z.string().min(1),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  supplierName: z.string().min(2),
  supplierTaxId: z.string().min(1).optional(),
  buyerName: z.string().min(2),
  buyerTaxId: z.string().min(1),
  incoterm: IncotermEnum,
  currency: CurrencyEnum,
  totalFobDeclared: z.number().nonnegative(),
  totalNetWeightKg: z.number().nonnegative(),
  totalGrossWeightKg: z.number().nonnegative(),
  items: z.array(CommercialInvoiceItemSchema).min(1)
}).superRefine((data, ctx) => {
  // Aritmetic Grounding Validation: Sum of items totalFob must match totalFobDeclared
  const calculatedFob = data.items.reduce((sum, it) => sum + it.totalFob, 0);
  const diffFob = Math.abs(calculatedFob - data.totalFobDeclared);
  if (diffFob > 0.05) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Zero-Hallucination violation: Sum of item FOB totals (${calculatedFob.toFixed(2)}) diverges from declared FOB (${data.totalFobDeclared.toFixed(2)}) by ${diffFob.toFixed(2)}`,
      path: ['totalFobDeclared']
    });
  }

  // Weight validation
  const calculatedWeight = data.items.reduce((sum, it) => sum + it.netWeightKg, 0);
  const diffWeight = Math.abs(calculatedWeight - data.totalNetWeightKg);
  if (diffWeight > 0.5) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Weight balance violation: Sum of item net weights (${calculatedWeight.toFixed(2)} kg) diverges from declared net weight (${data.totalNetWeightKg.toFixed(2)} kg)`,
      path: ['totalNetWeightKg']
    });
  }
});
export type CommercialInvoiceExtraction = z.infer<typeof CommercialInvoiceExtractionSchema>;

// ==============================================================================
// 2. BILL OF LADING (BL / AWB) EXTRACTION SCHEMA
// ==============================================================================
export const BillOfLadingExtractionSchema = z.object({
  documentType: z.literal('bill_of_lading'),
  blNumber: z.string().min(2),
  carrierName: z.string().min(2),
  vesselName: z.string().min(2),
  voyageNumber: z.string().min(1),
  portOfLoading: z.string().min(2),
  portOfDischarge: z.string().min(2),
  shipperName: z.string().min(2),
  consigneeName: z.string().min(2),
  containerNumbers: z.array(z.string().min(4)).min(1),
  sealNumbers: z.array(z.string().min(2)).default([]),
  totalGrossWeightKg: z.number().positive(),
  totalMeasurementCbm: z.number().nonnegative(),
  totalFreightDeclared: z.number().nonnegative(),
  currency: CurrencyEnum.default('USD'),
  freightTerms: z.enum(['PREPAID', 'COLLECT'])
});
export type BillOfLadingExtraction = z.infer<typeof BillOfLadingExtractionSchema>;

// ==============================================================================
// 3. DUA / DAM CUSTOMS DECLARATION SCHEMA
// ==============================================================================
export const DuaLineItemSchema = z.object({
  itemSequence: z.number().int().positive(),
  hsCode: z.string().regex(/^\d{10}$/, 'Customs Tariff HS Code must be exactly 10 digits'),
  commercialDescription: z.string().min(2),
  fobValue: z.number().nonnegative(),
  freightValue: z.number().nonnegative(),
  insuranceValue: z.number().nonnegative(),
  cifValue: z.number().nonnegative(),
  netWeightKg: z.number().nonnegative(),
  grossWeightKg: z.number().nonnegative(),
  adValoremRate: z.number().min(0).max(1), // e.g. 0.00, 0.06, 0.11
  adValoremAmount: z.number().nonnegative(),
  igvRate: z.number().min(0).max(1).default(0.16),
  igvAmount: z.number().nonnegative(),
  ipmRate: z.number().min(0).max(1).default(0.02),
  ipmAmount: z.number().nonnegative(),
  perceptionRate: z.number().min(0).max(1).default(0.035),
  perceptionAmount: z.number().nonnegative()
}).superRefine((data, ctx) => {
  const calculatedCif = +(data.fobValue + data.freightValue + data.insuranceValue).toFixed(2);
  const diffCif = Math.abs(calculatedCif - data.cifValue);
  if (diffCif > 0.05) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `DUA Line Item CIF violation: FOB + Freight + Insurance (${calculatedCif}) does not match CIF (${data.cifValue})`,
      path: ['cifValue']
    });
  }
});
export type DuaLineItem = z.infer<typeof DuaLineItemSchema>;

export const DuaCustomsDeclarationSchema = z.object({
  documentType: z.literal('dua_customs_declaration'),
  duaNumber: z.string().regex(/^\d{3}-\d{4}-\d{2}-\d{6}$/, 'DUA number must follow format 118-2026-10-123456'),
  regimeCode: z.string().default('10'), // Importación para el consumo
  declarationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  customsOffice: z.string().min(2),
  importerRuc: z.string().min(8),
  importerName: z.string().min(2),
  currency: CurrencyEnum.default('USD'),
  totalFob: z.number().nonnegative(),
  totalFreight: z.number().nonnegative(),
  totalInsurance: z.number().nonnegative(),
  totalCif: z.number().nonnegative(),
  totalAdValorem: z.number().nonnegative(),
  totalIgv: z.number().nonnegative(),
  totalIpm: z.number().nonnegative(),
  totalPerception: z.number().nonnegative(),
  totalTaxesPayable: z.number().nonnegative(),
  totalGrossWeightKg: z.number().positive(),
  totalNetWeightKg: z.number().positive(),
  items: z.array(DuaLineItemSchema).min(1)
}).superRefine((data, ctx) => {
  const sumFob = +data.items.reduce((s, it) => s + it.fobValue, 0).toFixed(2);
  if (Math.abs(sumFob - data.totalFob) > 0.05) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `DUA Total FOB mismatch: items sum ${sumFob} vs declared ${data.totalFob}`,
      path: ['totalFob']
    });
  }

  const sumCif = +data.items.reduce((s, it) => s + it.cifValue, 0).toFixed(2);
  if (Math.abs(sumCif - data.totalCif) > 0.05) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `DUA Total CIF mismatch: items sum ${sumCif} vs declared ${data.totalCif}`,
      path: ['totalCif']
    });
  }
});
export type DuaCustomsDeclaration = z.infer<typeof DuaCustomsDeclarationSchema>;

// ==============================================================================
// 4. LOCAL EXPENSES RECEIPT SCHEMA
// ==============================================================================
export const LocalExpensesReceiptSchema = z.object({
  documentType: z.literal('local_expenses_receipt'),
  receiptNumber: z.string().min(2),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  supplierRuc: z.string().min(8),
  supplierName: z.string().min(2),
  concept: LocalExpenseConceptEnum,
  currency: CurrencyEnum,
  subtotalAmount: z.number().nonnegative(),
  taxAmount: z.number().nonnegative(),
  totalAmount: z.number().nonnegative(),
  appliesToShipmentDossier: z.string().min(1)
}).superRefine((data, ctx) => {
  const expectedTotal = +(data.subtotalAmount + data.taxAmount).toFixed(2);
  if (Math.abs(expectedTotal - data.totalAmount) > 0.02) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Receipt math mismatch: subtotal + tax (${expectedTotal}) != total (${data.totalAmount})`,
      path: ['totalAmount']
    });
  }
});
export type LocalExpensesReceipt = z.infer<typeof LocalExpensesReceiptSchema>;

// Discriminated Union for any Customs Document Payload
export const AnyCustomsDocumentSchema = z.discriminatedUnion('documentType', [
  CommercialInvoiceExtractionSchema,
  BillOfLadingExtractionSchema,
  DuaCustomsDeclarationSchema,
  LocalExpensesReceiptSchema
]);
export type AnyCustomsDocument = z.infer<typeof AnyCustomsDocumentSchema>;
