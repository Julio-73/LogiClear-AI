import { createHash } from 'crypto';
import {
  CommercialInvoiceExtraction,
  DuaCustomsDeclaration,
  LocalExpensesReceipt
} from '../genai/extraction_schemas';

/**
 * LOGICLEAR AI — DETERMINISTIC RECONCILIATION & LANDED COST ENGINE
 * Standard: Pure Mathematical Functions, Zero Network Calls, High-Precision Rounding
 * Execution SLA: < 25ms for 1,000 line items
 */

export type DiscrepancySeverity = 'green' | 'yellow' | 'red';

export interface ProrationFactors {
  weightFactor: number; // Item Weight / Total Weight
  valueFactor: number;  // Item FOB / Total FOB
}

export interface ReconciledLineItem {
  itemSequence: number;
  invoiceHsCode: string;
  duaHsCode: string;
  hsCodeMatches: boolean;
  commercialDescription: string;
  quantity: number;
  unitOfMeasure: string;
  unitPriceFob: number;
  invoiceTotalFob: number;
  duaTotalFob: number;
  fobDiscrepancy: number;
  netWeightKg: number;
  grossWeightKg: number;
  weightProrationFactor: number;
  valueProrationFactor: number;
  // Prorated Logistics
  proratedFreight: number;
  proratedInsurance: number;
  cifValue: number;
  // Customs Taxes & Duties
  adValoremRate: number;
  adValoremAmount: number;
  igvRate: number;
  igvAmount: number;
  ipmRate: number;
  ipmAmount: number;
  perceptionRate: number;
  perceptionAmount: number;
  proratedLocalExpenses: number;
  // Landed Cost
  capitalizableLandedCostTotal: number;
  landedCostPerUnit: number;
  totalCashOutflow: number; // Includes taxes & perceptions
  // Discrepancy Tagging
  itemSeverity: DiscrepancySeverity;
  discrepancyReasons: string[];
}

export interface ReconciliationSummary {
  invoiceTotalFob: number;
  duaTotalFob: number;
  fobVariance: number;
  fobVariancePercentage: number;
  totalFreight: number;
  totalInsurance: number;
  totalCif: number;
  totalAdValorem: number;
  totalIgv: number;
  totalIpm: number;
  totalPerception: number;
  totalLocalExpenses: number;
  totalLandedCost: number;
  totalCashOutflow: number;
  overallSeverity: DiscrepancySeverity;
  isConforming: boolean;
  criticalIssuesCount: number;
  warningIssuesCount: number;
}

export interface ReconciliationReport {
  reconciliationId: string;
  dossierNumber: string;
  reconciledAt: string;
  summary: ReconciliationSummary;
  items: ReconciledLineItem[];
  auditHashSha256: string;
  calculationDurationMs: number;
}

export interface ReconciliationInput {
  dossierNumber: string;
  invoice: CommercialInvoiceExtraction;
  dua: DuaCustomsDeclaration;
  localExpenses?: LocalExpensesReceipt[];
  toleranceAbsoluteThreshold?: number; // Default: 0.01
  toleranceRelativeThreshold?: number; // Default: 0.0005 (0.05%)
}

export class CoreReconciliationEngine {
  private static round2(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  private static round4(val: number): number {
    return Math.round((val + Number.EPSILON) * 10000) / 10000;
  }

  private static round8(val: number): number {
    return Math.round((val + Number.EPSILON) * 100000000) / 100000000;
  }

  /**
   * Evaluates discrepancy severity based on strict business thresholds
   */
  public static evaluateSeverity(
    variance: number,
    hsMatches: boolean,
    absThreshold = 0.01,
    warningThreshold = 10.00
  ): { severity: DiscrepancySeverity; reasons: string[] } {
    const reasons: string[] = [];
    const absVariance = Math.abs(variance);

    if (!hsMatches) {
      reasons.push('Customs Tariff HS Code mismatch between commercial invoice and DUA');
      return { severity: 'red', reasons };
    }

    if (absVariance > warningThreshold) {
      reasons.push(`Material variance of $${absVariance.toFixed(2)} exceeds critical threshold of $${warningThreshold.toFixed(2)}`);
      return { severity: 'red', reasons };
    }

    if (absVariance > absThreshold) {
      reasons.push(`Minor discrepancy of $${absVariance.toFixed(2)} detected`);
      return { severity: 'yellow', reasons };
    }

    return { severity: 'green', reasons };
  }

  /**
   * Main deterministic reconciliation pipeline
   */
  public static reconcile(input: ReconciliationInput): ReconciliationReport {
    const startTime = performance.now();
    const { invoice, dua, localExpenses = [] } = input;
    const absThreshold = input.toleranceAbsoluteThreshold ?? 0.01;

    // Total local expenses accumulated
    const totalLocalExpenses = this.round2(
      localExpenses.reduce((sum, exp) => sum + exp.totalAmount, 0)
    );

    const invoiceTotalFob = this.round2(invoice.totalFobDeclared);
    const invoiceTotalWeight = this.round4(invoice.totalNetWeightKg || invoice.items.reduce((s, it) => s + it.netWeightKg, 0));

    const duaFreight = this.round2(dua.totalFreight);
    const duaInsurance = this.round2(dua.totalInsurance);

    let criticalCount = 0;
    let warningCount = 0;

    // Reconcile line items 1:1
    const reconciledItems: ReconciledLineItem[] = [];

    // Map DUA items by sequence or HS Code
    const duaMap = new Map<number, typeof dua.items[0]>();
    dua.items.forEach(it => duaMap.set(it.itemSequence, it));

    for (const invItem of invoice.items) {
      const matchedDua = duaMap.get(invItem.itemSequence) || dua.items.find(d => d.hsCode.startsWith(invItem.hsCode));
      const duaHsCode = matchedDua ? matchedDua.hsCode : 'NOT_FOUND_IN_DUA';
      const hsMatches = matchedDua ? matchedDua.hsCode.startsWith(invItem.hsCode) || invItem.hsCode.startsWith(matchedDua.hsCode) : false;

      const duaItemFob = matchedDua ? this.round2(matchedDua.fobValue) : 0;
      const fobDiff = this.round2(invItem.totalFob - duaItemFob);

      // Proration factors
      const weightFactor = invoiceTotalWeight > 0 ? this.round8(invItem.netWeightKg / invoiceTotalWeight) : 0;
      const valueFactor = invoiceTotalFob > 0 ? this.round8(invItem.totalFob / invoiceTotalFob) : 0;

      // Logistics allocations
      const proratedFreight = this.round2(duaFreight * weightFactor);
      const proratedInsurance = this.round2(duaInsurance * valueFactor);
      const calculatedCif = this.round2(invItem.totalFob + proratedFreight + proratedInsurance);

      // Taxes & Duties
      const adValoremRate = matchedDua ? matchedDua.adValoremRate : 0.06;
      const adValoremAmount = matchedDua ? this.round2(matchedDua.adValoremAmount) : this.round2(calculatedCif * adValoremRate);

      const igvRate = matchedDua?.igvRate ?? 0.16;
      const igvAmount = matchedDua ? this.round2(matchedDua.igvAmount) : this.round2((calculatedCif + adValoremAmount) * igvRate);

      const ipmRate = matchedDua?.ipmRate ?? 0.02;
      const ipmAmount = matchedDua ? this.round2(matchedDua.ipmAmount) : this.round2((calculatedCif + adValoremAmount) * ipmRate);

      const perceptionRate = matchedDua?.perceptionRate ?? 0.035;
      const taxBasePerception = calculatedCif + adValoremAmount + igvAmount + ipmAmount;
      const perceptionAmount = matchedDua ? this.round2(matchedDua.perceptionAmount) : this.round2(taxBasePerception * perceptionRate);

      // Local expenses allocated by value factor
      const proratedLocalExpenses = this.round2(totalLocalExpenses * valueFactor);

      // Capitalizable Landed Cost = FOB + Freight + Insurance + Ad-Valorem + Local Expenses
      const capitalizableLandedCostTotal = this.round2(
        invItem.totalFob + proratedFreight + proratedInsurance + adValoremAmount + proratedLocalExpenses
      );
      const landedCostPerUnit = invItem.quantity > 0 ? this.round4(capitalizableLandedCostTotal / invItem.quantity) : 0;

      // Total Cash Outflow = Capitalizable + Deductible Taxes (IGV + IPM + Perception)
      const totalCashOutflow = this.round2(
        capitalizableLandedCostTotal + igvAmount + ipmAmount + perceptionAmount
      );

      // Severity evaluation
      const { severity, reasons } = this.evaluateSeverity(fobDiff, hsMatches, absThreshold);
      if (severity === 'red') criticalCount++;
      if (severity === 'yellow') warningCount++;

      reconciledItems.push({
        itemSequence: invItem.itemSequence,
        invoiceHsCode: invItem.hsCode,
        duaHsCode,
        hsCodeMatches: hsMatches,
        commercialDescription: invItem.description,
        quantity: invItem.quantity,
        unitOfMeasure: invItem.unitOfMeasure,
        unitPriceFob: this.round4(invItem.unitPriceFob),
        invoiceTotalFob: this.round2(invItem.totalFob),
        duaTotalFob: duaItemFob,
        fobDiscrepancy: fobDiff,
        netWeightKg: this.round4(invItem.netWeightKg),
        grossWeightKg: this.round4(invItem.grossWeightKg ?? invItem.netWeightKg),
        weightProrationFactor: weightFactor,
        valueProrationFactor: valueFactor,
        proratedFreight,
        proratedInsurance,
        cifValue: calculatedCif,
        adValoremRate,
        adValoremAmount,
        igvRate,
        igvAmount,
        ipmRate,
        ipmAmount,
        perceptionRate,
        perceptionAmount,
        proratedLocalExpenses,
        capitalizableLandedCostTotal,
        landedCostPerUnit,
        totalCashOutflow,
        itemSeverity: severity,
        discrepancyReasons: reasons
      });
    }

    // Totals calculations
    const duaTotalFob = this.round2(dua.totalFob);
    const fobVariance = this.round2(invoiceTotalFob - duaTotalFob);
    const fobVariancePercentage = invoiceTotalFob > 0 ? this.round4((fobVariance / invoiceTotalFob) * 100) : 0;

    const totalCif = this.round2(reconciledItems.reduce((s, it) => s + it.cifValue, 0));
    const totalAdValorem = this.round2(reconciledItems.reduce((s, it) => s + it.adValoremAmount, 0));
    const totalIgv = this.round2(reconciledItems.reduce((s, it) => s + it.igvAmount, 0));
    const totalIpm = this.round2(reconciledItems.reduce((s, it) => s + it.ipmAmount, 0));
    const totalPerception = this.round2(reconciledItems.reduce((s, it) => s + it.perceptionAmount, 0));
    const totalLandedCost = this.round2(reconciledItems.reduce((s, it) => s + it.capitalizableLandedCostTotal, 0));
    const totalCashOutflow = this.round2(reconciledItems.reduce((s, it) => s + it.totalCashOutflow, 0));

    const overallSeverity: DiscrepancySeverity =
      criticalCount > 0 ? 'red' : warningCount > 0 ? 'yellow' : 'green';

    const summary: ReconciliationSummary = {
      invoiceTotalFob,
      duaTotalFob,
      fobVariance,
      fobVariancePercentage,
      totalFreight: duaFreight,
      totalInsurance: duaInsurance,
      totalCif,
      totalAdValorem,
      totalIgv,
      totalIpm,
      totalPerception,
      totalLocalExpenses,
      totalLandedCost,
      totalCashOutflow,
      overallSeverity,
      isConforming: overallSeverity === 'green',
      criticalIssuesCount: criticalCount,
      warningIssuesCount: warningCount
    };

    const reconciliationId = `REC-${input.dossierNumber}-${Date.now()}`;
    const reconciledAt = new Date().toISOString();

    // Generate cryptographic hash for immutable verification
    const auditDataForHash = JSON.stringify({
      dossierNumber: input.dossierNumber,
      summary,
      itemCount: reconciledItems.length,
      reconciledAt
    });
    const auditHashSha256 = createHash('sha256').update(auditDataForHash).digest('hex');

    const durationMs = performance.now() - startTime;

    return {
      reconciliationId,
      dossierNumber: input.dossierNumber,
      reconciledAt,
      summary,
      items: reconciledItems,
      auditHashSha256,
      calculationDurationMs: this.round2(durationMs)
    };
  }
}
