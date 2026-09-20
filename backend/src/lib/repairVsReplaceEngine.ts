/**
 * repairVsReplaceEngine.ts
 *
 * Deterministic Repair-vs-Replace recommendation engine.
 * Logic defined exactly as in Design.md §16.
 *
 * RULES (Rules.md):
 *  - Never called by Bedrock. Never runs in the browser.
 *  - All inputs come from RepairData DynamoDB records + computed score from repairabilityEngine.
 *  - The "confidence" field is always "demo_estimate" when isDemoData=true (MVP).
 */

import { ComparisonDecisionSchema } from './schemas';
import { z } from 'zod';

export type ComparisonDecision = z.infer<typeof ComparisonDecisionSchema>;
export type ConfidenceLevel = 'high' | 'demo_estimate';

export interface RepairVsReplaceInput {
  repairCostMinINR: number;
  repairCostMaxINR: number;
  replacementCostMinINR: number;
  replacementCostMaxINR: number;
  partsAvailability: 'GOOD' | 'MEDIUM' | 'POOR';
  priorRepairs: 'NONE' | '1' | '2+';
  warrantyStatus: 'IN_WARRANTY' | 'OUT_OF_WARRANTY' | 'UNSURE';
  expectedRemainingUsabilityYears: number;
  purchasePriceINR: number;
}

export interface RepairVsReplaceResult {
  decision: ComparisonDecision;
  rationale: string;
  confidence: ConfidenceLevel;
  avgRepairCostINR: number;
  avgReplacementCostINR: number;
  repairCostPerYear: number;
  replaceCostPerYear: number;
}

const RATIONALE: Record<ComparisonDecision, string> = {
  repair_recommended:
    'Repair is clearly the better value — cost is low relative to replacement and expected longevity is good.',
  replacement_recommended:
    'Replacement is likely the more practical option due to high relative repair costs or poor parts availability.',
  neutral:
    'Both options are reasonable based on cost-per-year — consider your device\'s age and how much longer you need it.',
};

/**
 * Compute the Repair-vs-Replace recommendation via cost-per-year math.
 */
export function computeRepairVsReplace(input: RepairVsReplaceInput): RepairVsReplaceResult {
  let avgRepair = (input.repairCostMinINR + input.repairCostMaxINR) / 2;
  const avgReplacement = (input.replacementCostMinINR + input.replacementCostMaxINR) / 2;

  // 1. effectiveRepairCost
  let effectiveRepairCost = avgRepair;
  if (input.warrantyStatus === 'IN_WARRANTY') {
    // Under warranty, repair cost is roughly negligible or small service fee
    effectiveRepairCost = Math.min(effectiveRepairCost, 500); 
  }

  // 2. effectiveReplaceCost
  const resaleValueEstimate = input.purchasePriceINR * 0.15; // 15% of original price
  const effectiveReplaceCost = Math.max(0, avgReplacement - resaleValueEstimate);

  // 3. cost-per-year
  let repairCostPerYear = effectiveRepairCost / (input.expectedRemainingUsabilityYears || 1);
  const replaceCostPerYear = effectiveReplaceCost / 4; // Assuming 4 years average new device lifespan

  // 4. Multipliers
  if (input.priorRepairs === '2+') {
    repairCostPerYear *= 1.3;
  }
  if (input.partsAvailability === 'POOR') {
    repairCostPerYear *= 1.5;
  }

  let decision: ComparisonDecision;
  const ratio = repairCostPerYear / replaceCostPerYear;

  // If they are within 10% of each other, tie.
  if (Math.abs(1 - ratio) <= 0.1) {
    decision = 'neutral';
  } else if (repairCostPerYear < replaceCostPerYear) {
    decision = 'repair_recommended';
  } else {
    decision = 'replacement_recommended';
  }

  return {
    decision,
    rationale: RATIONALE[decision],
    confidence: 'high',
    avgRepairCostINR: Math.round(avgRepair),
    avgReplacementCostINR: Math.round(avgReplacement),
    repairCostPerYear: Math.round(repairCostPerYear),
    replaceCostPerYear: Math.round(replaceCostPerYear),
  };
}
