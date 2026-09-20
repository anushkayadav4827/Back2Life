/**
 * repairabilityEngine.ts
 *
 * Deterministic, pure-function Repairability Score calculator.
 * Formula and weights are defined exactly as in Design.md §15.
 *
 * RULES (Rules.md):
 *  - This engine is NEVER called by Bedrock and NEVER runs in the browser.
 *  - All inputs come from RepairData DynamoDB records — never from AI output.
 *  - If RepairData is missing, returns { success: false } — never a fabricated score.
 */

export type PartsAvailability = 'GOOD' | 'MEDIUM' | 'POOR';
export type RepairComplexity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RepairabilityInput {
  partsAvailability: PartsAvailability;
  repairComplexity: RepairComplexity;
  repairCostMinINR: number;
  repairCostMaxINR: number;
  replacementCostMinINR: number;
  replacementCostMaxINR: number;
  expectedRemainingUsabilityYears: number;
  /** Optional: device age in fractional years. Omit if unknown — defaults to 70. */
  deviceAgeYears?: number;
  /** Optional: prior repair count string (e.g. 'NONE', '1', '2+'). */
  priorRepairs?: string;
}

export interface ScoreBreakdown {
  partsAvailabilityScore: number;
  costRatioScore: number;
  complexityScore: number;
  ageFactorScore: number;
  usabilityScore: number;
}

export type ScoreBand =
  | 'Excellent — repair strongly favored'
  | 'Good — repair likely worthwhile'
  | 'Fair — repair possible, compare carefully'
  | 'Poor — replacement likely more practical'
  | 'Not recommended — replacement favored';

export interface RepairabilitySuccess {
  success: true;
  score: number;
  scoreBand: ScoreBand;
  breakdown: ScoreBreakdown;
}

export interface RepairabilityFailure {
  success: false;
  reason: 'INSUFFICIENT_DATA';
}

export type RepairabilityResult = RepairabilitySuccess | RepairabilityFailure;

// ── Factor scoring helpers ─────────────────────────────────────────────────

export function partsAvailabilityScore(availability: PartsAvailability): number {
  const map: Record<PartsAvailability, number> = { GOOD: 100, MEDIUM: 60, POOR: 20 };
  return map[availability];
}

export function repairComplexityScore(complexity: RepairComplexity): number {
  const map: Record<RepairComplexity, number> = { LOW: 100, MEDIUM: 60, HIGH: 20 };
  return map[complexity];
}

/**
 * Cost ratio score.
 * = clamp(1 - avgRepairCost / avgReplacementCost, 0, 1) × 100
 * Clamped to [0, 100]. Never negative.
 */
export function costRatioScore(
  repairCostMinINR: number,
  repairCostMaxINR: number,
  replacementCostMinINR: number,
  replacementCostMaxINR: number,
): number {
  const avgRepair = (repairCostMinINR + repairCostMaxINR) / 2;
  const avgReplacement = (replacementCostMinINR + replacementCostMaxINR) / 2;

  if (avgReplacement <= 0) return 0; // guard against divide-by-zero

  const ratio = 1 - avgRepair / avgReplacement;
  const clamped = Math.max(0, Math.min(1, ratio));
  return clamped * 100;
}

/**
 * Device age factor.
 * 0–1 yr  = 100
 * 1–3 yr  = 70
 * 3–5 yr  = 40
 * 5+ yr   = 15
 * unknown = 70 (default)
 */
export function deviceAgeFactor(deviceAgeYears?: number): number {
  if (deviceAgeYears === undefined || deviceAgeYears === null) return 70;
  if (deviceAgeYears < 1) return 100;
  if (deviceAgeYears < 3) return 70;
  if (deviceAgeYears < 5) return 40;
  return 15;
}

/**
 * Expected remaining usability score.
 * = min(years / 3, 1) × 100
 */
export function usabilityScore(expectedRemainingUsabilityYears: number): number {
  return Math.min(expectedRemainingUsabilityYears / 3, 1) * 100;
}

// ── Main scoring function ──────────────────────────────────────────────────

/**
 * Compute the Repairability Score from a RepairData record.
 *
 * Returns { success: false, reason: 'INSUFFICIENT_DATA' } if input is missing.
 * Never returns a fabricated score — edge case design per Design.md §15.
 */
export function computeRepairabilityScore(input: RepairabilityInput | null | undefined): RepairabilityResult {
  if (!input) {
    return { success: false, reason: 'INSUFFICIENT_DATA' };
  }

  const breakdown: ScoreBreakdown = {
    partsAvailabilityScore: partsAvailabilityScore(input.partsAvailability),
    costRatioScore: costRatioScore(
      input.repairCostMinINR,
      input.repairCostMaxINR,
      input.replacementCostMinINR,
      input.replacementCostMaxINR,
    ),
    complexityScore: repairComplexityScore(input.repairComplexity),
    ageFactorScore: deviceAgeFactor(input.deviceAgeYears),
    usabilityScore: usabilityScore(input.expectedRemainingUsabilityYears),
  };

  let rawScore =
    0.30 * breakdown.partsAvailabilityScore +
    0.30 * breakdown.costRatioScore +
    0.20 * breakdown.complexityScore +
    0.10 * breakdown.ageFactorScore +
    0.10 * breakdown.usabilityScore;

  // Apply repeated-repair penalty
  if (input.priorRepairs === '1') {
    rawScore *= 0.90;
  } else if (input.priorRepairs === '2+') {
    rawScore *= 0.80;
  }

  const score = Math.round(rawScore);

  return {
    success: true,
    score,
    scoreBand: getScoreBand(score),
    breakdown,
  };
}

export function getScoreBand(score: number): ScoreBand {
  if (score >= 80) return 'Excellent — repair strongly favored';
  if (score >= 60) return 'Good — repair likely worthwhile';
  if (score >= 40) return 'Fair — repair possible, compare carefully';
  if (score >= 20) return 'Poor — replacement likely more practical';
  return 'Not recommended — replacement favored';
}
