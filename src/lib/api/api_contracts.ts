import { z } from 'zod';
import {
  CommercialInvoiceExtractionSchema,
  DuaCustomsDeclarationSchema,
  LocalExpensesReceiptSchema
} from '../genai/extraction_schemas';

/**
 * LOGICLEAR AI — API CONTRACTS & OPENAPI 3.1 SPECIFICATION
 * Strict runtime validation with Zod schemas and typed JSON responses
 */

// ==============================================================================
// 1. ENDPOINT REQUEST & RESPONSE SCHEMAS
// ==============================================================================

// Dossier Upload Request
export const UploadDossierFolderRequestSchema = z.object({
  dossierNumber: z.string().min(3).max(64),
  supplierName: z.string().min(2),
  incoterm: z.enum(['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF']),
  currency: z.enum(['USD', 'EUR', 'CNY', 'GBP', 'JPY', 'PEN']).default('USD'),
  portOfOrigin: z.string().min(2),
  portOfDestination: z.string().min(2),
  documents: z.array(z.object({
    fileName: z.string().min(1),
    fileSizeBytes: z.number().int().positive(),
    mimeType: z.string(),
    storageUrl: z.string().url(),
    documentType: z.enum(['commercial_invoice', 'bill_of_lading', 'dua_customs_declaration', 'local_expenses_receipt'])
  })).min(1)
});
export type UploadDossierFolderRequest = z.infer<typeof UploadDossierFolderRequestSchema>;

export const UploadDossierFolderResponseSchema = z.object({
  success: z.boolean(),
  shipmentId: z.string().uuid(),
  dossierNumber: z.string(),
  status: z.string(),
  filesQueuedForOcr: z.number().int(),
  createdAt: z.string().datetime()
});
export type UploadDossierFolderResponse = z.infer<typeof UploadDossierFolderResponseSchema>;

// Run Reconciliation Request
export const RunReconciliationRequestSchema = z.object({
  shipmentId: z.string().uuid(),
  dossierNumber: z.string().min(3),
  invoice: CommercialInvoiceExtractionSchema,
  dua: DuaCustomsDeclarationSchema,
  localExpenses: z.array(LocalExpensesReceiptSchema).optional().default([]),
  toleranceAbsoluteThreshold: z.number().positive().default(0.01)
});
export type RunReconciliationRequest = z.infer<typeof RunReconciliationRequestSchema>;

// Error Response Schema (RFC 7807 Problem Details)
export const ProblemDetailsSchema = z.object({
  type: z.string().url().default('about:blank'),
  title: z.string(),
  status: z.number().int(),
  detail: z.string(),
  instance: z.string().optional(),
  invalidParams: z.array(z.object({
    name: z.string(),
    reason: z.string()
  })).optional()
});
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;

// ==============================================================================
// 2. OPENAPI 3.1 FORMAL CONTRACT DEFINITION
// ==============================================================================
export const OPENAPI_3_1_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'LogiClear AI Enterprise B2B Reconciliation API',
    version: '1.0.0',
    description: 'API determinista de conciliación aduanera y prorrateo de Landed Cost con aislamiento multi-tenant.'
  },
  servers: [
    {
      url: 'https://api.logiclear.ai/v1',
      description: 'Production Cluster'
    }
  ],
  paths: {
    '/shipments/upload-dossier': {
      post: {
        summary: 'Carga interactiva de carpeta de expediente de importación',
        operationId: 'uploadDossierFolder',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UploadDossierFolderRequest'
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Expediente creado y documentos encolados',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UploadDossierFolderResponse'
                }
              }
            }
          },
          '400': {
            description: 'Error de validación en parámetros',
            content: {
              'application/problem+json': {
                schema: {
                  $ref: '#/components/schemas/ProblemDetails'
                }
              }
            }
          }
        }
      }
    },
    '/reconciliation/run': {
      post: {
        summary: 'Ejecuta conciliación matemática determinista y prorrateo de Landed Cost',
        operationId: 'runReconciliation',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RunReconciliationRequest'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Conciliación ejecutada exitosamente con hash criptográfico SHA-256'
          },
          '422': {
            description: 'Fallo de integridad aritmética o esquema Zod'
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      TenantSessionAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Bearer token with signed tenant_id claim'
      }
    }
  }
} as const;

/**
 * Validates request payload against Zod schema and generates standard RFC 7807 problem on error
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, rawData: unknown): { success: true; data: T } | { success: false; problem: ProblemDetails } {
  const result = schema.safeParse(rawData);
  if (!result.success) {
    return {
      success: false,
      problem: {
        type: 'https://logiclear.ai/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: 'The submitted request payload violates schema constraints.',
        invalidParams: result.error.issues.map(iss => ({
          name: iss.path.join('.'),
          reason: iss.message
        }))
      }
    };
  }
  return { success: true, data: result.data };
}
