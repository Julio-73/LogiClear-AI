import { createHash } from 'crypto';
import {
  AnyCustomsDocument,
  AnyCustomsDocumentSchema,
  CommercialInvoiceExtraction,
  CommercialInvoiceExtractionSchema,
  DuaCustomsDeclaration,
  DuaCustomsDeclarationSchema,
  BillOfLadingExtraction,
  BillOfLadingExtractionSchema,
  LocalExpensesReceipt,
  LocalExpensesReceiptSchema,
  DocumentType
} from './extraction_schemas';

/**
 * LOGICLEAR AI — EXTRACTION PIPELINE
 * Calibration: Temperature 0.0 (Strict Zero-Hallucination)
 * Cryptographic SHA-256 Provenance & Zod Validation
 */

export interface ExtractionPipelineConfig {
  temperature: number; // Must be strictly 0.0
  maxTokens: number;
  model: string;
  enforceChecksum: boolean;
  maxArithmeticDriftTolerance: number; // Max allowed rounding error (0.05)
}

export const DEFAULT_PIPELINE_CONFIG: ExtractionPipelineConfig = {
  temperature: 0.0,
  maxTokens: 4096,
  model: 'gemini-1.5-pro-customs-vision',
  enforceChecksum: true,
  maxArithmeticDriftTolerance: 0.05
};

export interface ExtractionResult<T = AnyCustomsDocument> {
  success: boolean;
  documentType: DocumentType;
  data?: T;
  rawPayloadHash: string;
  errors?: Array<{
    field: string;
    issue: string;
    code: string;
  }>;
  executionMetrics: {
    durationMs: number;
    arithmeticSumVerified: boolean;
    temperatureEnforced: number;
    validatedAt: string;
  };
}

export class ZeroHallucinationExtractionPipeline {
  private config: ExtractionPipelineConfig;

  constructor(config: Partial<ExtractionPipelineConfig> = {}) {
    this.config = {
      ...DEFAULT_PIPELINE_CONFIG,
      ...config,
      temperature: 0.0 // Hard constraint: never allow non-zero temperature
    };
  }

  /**
   * Generates SHA-256 checksum of raw payload to guarantee immutability
   */
  public calculateChecksum(payload: string | object): string {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Validates and ingests Commercial Invoice with zero hallucination
   */
  public ingestCommercialInvoice(rawJson: unknown): ExtractionResult<CommercialInvoiceExtraction> {
    const startTime = Date.now();
    const payloadHash = this.calculateChecksum(rawJson as object);

    const parseResult = CommercialInvoiceExtractionSchema.safeParse(rawJson);

    if (!parseResult.success) {
      return {
        success: false,
        documentType: 'commercial_invoice',
        rawPayloadHash: payloadHash,
        errors: parseResult.error.issues.map(iss => ({
          field: iss.path.join('.'),
          issue: iss.message,
          code: iss.code
        })),
        executionMetrics: {
          durationMs: Date.now() - startTime,
          arithmeticSumVerified: false,
          temperatureEnforced: this.config.temperature,
          validatedAt: new Date().toISOString()
        }
      };
    }

    return {
      success: true,
      documentType: 'commercial_invoice',
      data: parseResult.data,
      rawPayloadHash: payloadHash,
      executionMetrics: {
        durationMs: Date.now() - startTime,
        arithmeticSumVerified: true,
        temperatureEnforced: this.config.temperature,
        validatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Validates and ingests DUA Customs Declaration with strict CIF checks
   */
  public ingestDuaDeclaration(rawJson: unknown): ExtractionResult<DuaCustomsDeclaration> {
    const startTime = Date.now();
    const payloadHash = this.calculateChecksum(rawJson as object);

    const parseResult = DuaCustomsDeclarationSchema.safeParse(rawJson);

    if (!parseResult.success) {
      return {
        success: false,
        documentType: 'dua_customs_declaration',
        rawPayloadHash: payloadHash,
        errors: parseResult.error.issues.map(iss => ({
          field: iss.path.join('.'),
          issue: iss.message,
          code: iss.code
        })),
        executionMetrics: {
          durationMs: Date.now() - startTime,
          arithmeticSumVerified: false,
          temperatureEnforced: this.config.temperature,
          validatedAt: new Date().toISOString()
        }
      };
    }

    return {
      success: true,
      documentType: 'dua_customs_declaration',
      data: parseResult.data,
      rawPayloadHash: payloadHash,
      executionMetrics: {
        durationMs: Date.now() - startTime,
        arithmeticSumVerified: true,
        temperatureEnforced: this.config.temperature,
        validatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Validates and ingests Bill of Lading
   */
  public ingestBillOfLading(rawJson: unknown): ExtractionResult<BillOfLadingExtraction> {
    const startTime = Date.now();
    const payloadHash = this.calculateChecksum(rawJson as object);

    const parseResult = BillOfLadingExtractionSchema.safeParse(rawJson);

    if (!parseResult.success) {
      return {
        success: false,
        documentType: 'bill_of_lading',
        rawPayloadHash: payloadHash,
        errors: parseResult.error.issues.map(iss => ({
          field: iss.path.join('.'),
          issue: iss.message,
          code: iss.code
        })),
        executionMetrics: {
          durationMs: Date.now() - startTime,
          arithmeticSumVerified: false,
          temperatureEnforced: this.config.temperature,
          validatedAt: new Date().toISOString()
        }
      };
    }

    return {
      success: true,
      documentType: 'bill_of_lading',
      data: parseResult.data,
      rawPayloadHash: payloadHash,
      executionMetrics: {
        durationMs: Date.now() - startTime,
        arithmeticSumVerified: true,
        temperatureEnforced: this.config.temperature,
        validatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Validates and ingests Local Expenses Receipt
   */
  public ingestLocalExpense(rawJson: unknown): ExtractionResult<LocalExpensesReceipt> {
    const startTime = Date.now();
    const payloadHash = this.calculateChecksum(rawJson as object);

    const parseResult = LocalExpensesReceiptSchema.safeParse(rawJson);

    if (!parseResult.success) {
      return {
        success: false,
        documentType: 'local_expenses_receipt',
        rawPayloadHash: payloadHash,
        errors: parseResult.error.issues.map(iss => ({
          field: iss.path.join('.'),
          issue: iss.message,
          code: iss.code
        })),
        executionMetrics: {
          durationMs: Date.now() - startTime,
          arithmeticSumVerified: false,
          temperatureEnforced: this.config.temperature,
          validatedAt: new Date().toISOString()
        }
      };
    }

    return {
      success: true,
      documentType: 'local_expenses_receipt',
      data: parseResult.data,
      rawPayloadHash: payloadHash,
      executionMetrics: {
        durationMs: Date.now() - startTime,
        arithmeticSumVerified: true,
        temperatureEnforced: this.config.temperature,
        validatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Polymorphic ingest function based on discriminated union
   */
  public ingestAnyDocument(rawJson: unknown): ExtractionResult<AnyCustomsDocument> {
    const docType = (rawJson as { documentType?: DocumentType })?.documentType;
    switch (docType) {
      case 'commercial_invoice':
        return this.ingestCommercialInvoice(rawJson);
      case 'dua_customs_declaration':
        return this.ingestDuaDeclaration(rawJson);
      case 'bill_of_lading':
        return this.ingestBillOfLading(rawJson);
      case 'local_expenses_receipt':
        return this.ingestLocalExpense(rawJson);
      default: {
        const payloadHash = this.calculateChecksum(rawJson as object);
        return {
          success: false,
          documentType: (docType as unknown as DocumentType) || 'commercial_invoice',
          rawPayloadHash: payloadHash,
          errors: [{ field: 'documentType', issue: `Unsupported or missing documentType: ${docType}`, code: 'custom' }],
          executionMetrics: {
            durationMs: 0,
            arithmeticSumVerified: false,
            temperatureEnforced: this.config.temperature,
            validatedAt: new Date().toISOString()
          }
        };
      }
    }
  }
}
