/**
 * Unit tests for repairabilityEngine.ts (Step 4) and repairVsReplaceEngine.ts (Step 5).
 *
 * Test matrix per Rules.md §Testing + Design.md §15-16:
 *  - Worked example from Design.md (laptop, charging_port → ~85, Excellent)
 *  - Each factor boundary (GOOD/MEDIUM/POOR, LOW/MEDIUM/HIGH, age bands)
 *  - Min/max score bounds (0 clamp, 100 cap)
 *  - Missing data → INSUFFICIENT_DATA, never fabricated score
 *  - Cost ratio clamping (repair >= replacement → 0)
 *  - Repair-vs-Replace: repair-favored, replace-favored, neutral cases
 *  - Repair-vs-Replace: confidence = demo_estimate when isDemoData=true
 */
import assert from 'node:assert';
import test from 'node:test';
import {
  computeRepairabilityScore,
  partsAvailabilityScore,
  repairComplexityScore,
  costRatioScore,
  deviceAgeFactor,
  usabilityScore,
  getScoreBand,
} from '../lib/repairabilityEngine';
import { computeRepairVsReplace } from '../lib/repairVsReplaceEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Factor helpers — unit tests
// ─────────────────────────────────────────────────────────────────────────────

test('[partsAvailabilityScore] GOOD=100, MEDIUM=60, POOR=20', () => {
  assert.strictEqual(partsAvailabilityScore('GOOD'), 100);
  assert.strictEqual(partsAvailabilityScore('MEDIUM'), 60);
  assert.strictEqual(partsAvailabilityScore('POOR'), 20);
});

test('[repairComplexityScore] LOW=100, MEDIUM=60, HIGH=20', () => {
  assert.strictEqual(repairComplexityScore('LOW'), 100);
  assert.strictEqual(repairComplexityScore('MEDIUM'), 60);
  assert.strictEqual(repairComplexityScore('HIGH'), 20);
});

test('[costRatioScore] laptop charging_port example: ≈98', () => {
  // avgRepair=800, avgReplacement=47500 → 1 - 800/47500 ≈ 0.9832 → 98.32
  const result = costRatioScore(400, 1200, 35000, 60000);
  // avg repair = 800, avg replacement = 47500 → ratio ≈ 98.32
  assert.ok(result > 97 && result < 99, `Expected ~98, got ${result}`);
});

test('[costRatioScore] clamps to 0 when repair >= replacement', () => {
  const result = costRatioScore(50000, 60000, 10000, 20000);
  assert.strictEqual(result, 0, 'Should clamp to 0 when repair >= replacement');
});

test('[costRatioScore] clamps to 100 when repair is free', () => {
  const result = costRatioScore(0, 0, 10000, 20000);
  assert.strictEqual(result, 100);
});

test('[costRatioScore] guard: zero replacement cost returns 0', () => {
  const result = costRatioScore(0, 0, 0, 0);
  assert.strictEqual(result, 0);
});

test('[deviceAgeFactor] age bands', () => {
  assert.strictEqual(deviceAgeFactor(0), 100, '0 years → 100');
  assert.strictEqual(deviceAgeFactor(0.9), 100, '0.9 years → 100');
  assert.strictEqual(deviceAgeFactor(1), 70, '1.0 years → 70');
  assert.strictEqual(deviceAgeFactor(2.5), 70, '2.5 years → 70');
  assert.strictEqual(deviceAgeFactor(3), 40, '3.0 years → 40');
  assert.strictEqual(deviceAgeFactor(4.9), 40, '4.9 years → 40');
  assert.strictEqual(deviceAgeFactor(5), 15, '5.0 years → 15');
  assert.strictEqual(deviceAgeFactor(10), 15, '10 years → 15');
  assert.strictEqual(deviceAgeFactor(undefined), 70, 'undefined → default 70');
});

test('[usabilityScore] formula: min(years/3, 1) × 100', () => {
  // 2 years → min(2/3,1)×100 = 66.67
  const score2yr = usabilityScore(2);
  assert.ok(Math.abs(score2yr - 66.67) < 0.1, `Expected ~66.67, got ${score2yr}`);

  // 3 years → min(1,1)×100 = 100
  assert.strictEqual(usabilityScore(3), 100);

  // 6 years → capped at 100
  assert.strictEqual(usabilityScore(6), 100);

  // 0 years → 0
  assert.strictEqual(usabilityScore(0), 0);
});

test('[getScoreBand] correct bands 0-100', () => {
  assert.ok(getScoreBand(100).startsWith('Excellent'));
  assert.ok(getScoreBand(80).startsWith('Excellent'));
  assert.ok(getScoreBand(79).startsWith('Good'));
  assert.ok(getScoreBand(60).startsWith('Good'));
  assert.ok(getScoreBand(59).startsWith('Fair'));
  assert.ok(getScoreBand(40).startsWith('Fair'));
  assert.ok(getScoreBand(39).startsWith('Poor'));
  assert.ok(getScoreBand(20).startsWith('Poor'));
  assert.ok(getScoreBand(19).startsWith('Not recommended'));
  assert.ok(getScoreBand(0).startsWith('Not recommended'));
});

// ─────────────────────────────────────────────────────────────────────────────
// computeRepairabilityScore — integration
// ─────────────────────────────────────────────────────────────────────────────

test('[computeRepairabilityScore] Design.md worked example: laptop charging_port → ~85 Excellent', () => {
  // From Design.md §15:
  // parts=GOOD(100), complexity=MEDIUM(60), costRatio≈98, age=unknown(70), usability=2yr(≈66.67)
  // score = 0.30×100 + 0.30×98 + 0.20×60 + 0.10×70 + 0.10×66.67 ≈ 85
  const result = computeRepairabilityScore({
    partsAvailability: 'GOOD',
    repairComplexity: 'MEDIUM',
    repairCostMinINR: 400,
    repairCostMaxINR: 1200,
    replacementCostMinINR: 35000,
    replacementCostMaxINR: 60000,
    expectedRemainingUsabilityYears: 2,
    deviceAgeYears: undefined, // unknown → defaults to 70
  });

  assert.strictEqual(result.success, true);
  if (!result.success) throw new Error('Unexpected failure');
  assert.ok(result.score >= 84 && result.score <= 86, `Expected score ~85, got ${result.score}`);
  assert.ok(result.scoreBand.startsWith('Excellent'), `Expected Excellent band, got "${result.scoreBand}"`);
  console.log(`   [WORKED EXAMPLE] score=${result.score}, band="${result.scoreBand}"`);
  console.log(`   breakdown:`, JSON.stringify(result.breakdown, null, 2));
});

test('[computeRepairabilityScore] clear repair-favored case: GOOD/LOW, cheap repair', () => {
  // Earpad replacement: LOW complexity, GOOD parts, very cheap, new device
  const result = computeRepairabilityScore({
    partsAvailability: 'GOOD',
    repairComplexity: 'LOW',
    repairCostMinINR: 300,
    repairCostMaxINR: 700,
    replacementCostMinINR: 10000,
    replacementCostMaxINR: 20000,
    expectedRemainingUsabilityYears: 3,
    deviceAgeYears: 0.5,
  });
  assert.strictEqual(result.success, true);
  if (!result.success) throw new Error('Unexpected failure');
  // parts=100, costRatio≈97, complexity=100, age=100, usability=100
  // ≈ 30+29.1+20+10+10 = 99.1 → 99
  assert.ok(result.score >= 95, `Expected high score, got ${result.score}`);
  assert.ok(result.scoreBand.startsWith('Excellent'));
  console.log(`   [REPAIR FAVORED] score=${result.score}`);
});

test('[computeRepairabilityScore] clear replace-favored case: POOR/HIGH, expensive repair', () => {
  // GPU failure: HIGH complexity, POOR parts, very expensive
  const result = computeRepairabilityScore({
    partsAvailability: 'POOR',
    repairComplexity: 'HIGH',
    repairCostMinINR: 8000,
    repairCostMaxINR: 15000,
    replacementCostMinINR: 35000,
    replacementCostMaxINR: 60000,
    expectedRemainingUsabilityYears: 1,
    deviceAgeYears: 6,
  });
  assert.strictEqual(result.success, true);
  if (!result.success) throw new Error('Unexpected failure');
  // parts=20, costRatio≈78, complexity=20, age=15, usability≈33
  // ≈ 6+23.4+4+1.5+3.3 = 38.2 → 38 → "Poor"
  assert.ok(result.score < 45, `Expected low score, got ${result.score}`);
  console.log(`   [REPLACE FAVORED] score=${result.score}, band="${result.scoreBand}"`);
});

test('[computeRepairabilityScore] neutral / fair case: MEDIUM/MEDIUM, mid-range cost', () => {
  const result = computeRepairabilityScore({
    partsAvailability: 'MEDIUM',
    repairComplexity: 'MEDIUM',
    repairCostMinINR: 3000,
    repairCostMaxINR: 6000,
    replacementCostMinINR: 20000,
    replacementCostMaxINR: 30000,
    expectedRemainingUsabilityYears: 2,
    deviceAgeYears: 3,
  });
  assert.strictEqual(result.success, true);
  if (!result.success) throw new Error('Unexpected failure');
  console.log(`   [NEUTRAL CASE] score=${result.score}, band="${result.scoreBand}"`);
  // Should be in Fair or Good range
  assert.ok(result.score >= 35 && result.score <= 75, `Expected mid-range, got ${result.score}`);
});

test('[computeRepairabilityScore] edge: costRatioScore clamps to 0 when repair > replacement', () => {
  const result = computeRepairabilityScore({
    partsAvailability: 'POOR',
    repairComplexity: 'HIGH',
    repairCostMinINR: 50000,
    repairCostMaxINR: 60000,
    replacementCostMinINR: 10000,
    replacementCostMaxINR: 20000,
    expectedRemainingUsabilityYears: 0,
    deviceAgeYears: 8,
  });
  assert.strictEqual(result.success, true);
  if (!result.success) throw new Error('Unexpected failure');
  assert.strictEqual(result.breakdown.costRatioScore, 0, 'Cost ratio must be 0 when repair > replacement');
  console.log(`   [COST CLAMPED 0] score=${result.score}, costRatio=0`);
});

test('[computeRepairabilityScore] edge: INSUFFICIENT_DATA when input is null', () => {
  const result = computeRepairabilityScore(null);
  assert.strictEqual(result.success, false);
  if (result.success) throw new Error('Should have failed');
  assert.strictEqual(result.reason, 'INSUFFICIENT_DATA');
  console.log('   [NULL INPUT] → INSUFFICIENT_DATA (never fabricates a score) ✓');
});

test('[computeRepairabilityScore] edge: INSUFFICIENT_DATA when input is undefined', () => {
  const result = computeRepairabilityScore(undefined);
  assert.strictEqual(result.success, false);
});

test('[computeRepairabilityScore] score is always an integer (Math.round)', () => {
  const result = computeRepairabilityScore({
    partsAvailability: 'MEDIUM',
    repairComplexity: 'MEDIUM',
    repairCostMinINR: 1000,
    repairCostMaxINR: 2000,
    replacementCostMinINR: 15000,
    replacementCostMaxINR: 25000,
    expectedRemainingUsabilityYears: 1.5,
    deviceAgeYears: 2.3,
  });
  assert.strictEqual(result.success, true);
  if (!result.success) throw new Error('Unexpected failure');
  assert.strictEqual(result.score, Math.round(result.score), 'Score must be an integer');
});

// ─────────────────────────────────────────────────────────────────────────────
// computeRepairVsReplace — Step 5
// ─────────────────────────────────────────────────────────────────────────────

test('[computeRepairVsReplace] repair_recommended: score=85, cheap repair', () => {
  const result = computeRepairVsReplace({
    
    repairCostMinINR: 400,
    repairCostMaxINR: 1200,
    replacementCostMinINR: 35000,
    replacementCostMaxINR: 60000,
    
  });
  // score≥60 AND avgRepair(800) < 0.5×avgReplacement(47500=23750) ✓
  assert.strictEqual(result.decision, 'repair_recommended');
  assert.strictEqual(result.confidence, 'demo_estimate', 'MVP always demo_estimate');
  assert.strictEqual(result.avgRepairCostINR, 800);
  assert.strictEqual(result.avgReplacementCostINR, 47500);
  console.log(`   [REPAIR REC] decision=${result.decision}, confidence=${result.confidence}`);
});

test('[computeRepairVsReplace] replacement_recommended: score=25 (low score)', () => {
  const result = computeRepairVsReplace({
    
    repairCostMinINR: 6000,
    repairCostMaxINR: 9000,
    replacementCostMinINR: 35000,
    replacementCostMaxINR: 60000,
    
  });
  // score≤30 → replacement_recommended
  assert.strictEqual(result.decision, 'replacement_recommended');
  assert.strictEqual(result.confidence, 'demo_estimate');
  console.log(`   [REPLACE REC] decision=${result.decision}`);
});

test('[computeRepairVsReplace] replacement_recommended: repair cost ≥ 80% of replacement', () => {
  const result = computeRepairVsReplace({
    
    repairCostMinINR: 18000,
    repairCostMaxINR: 22000, // avg=20000
    replacementCostMinINR: 22000,
    replacementCostMaxINR: 28000, // avg=25000 → 20000/25000=80% ≥ 80%
    
  });
  assert.strictEqual(result.decision, 'replacement_recommended', 'Repair ≥ 80% of replacement → replace');
  console.log(`   [REPLACE REC 80%] avgRepair=${result.avgRepairCostINR}, avgReplace=${result.avgReplacementCostINR}`);
});

test('[computeRepairVsReplace] neutral: score in 40-59 range, mid-cost ratio', () => {
  // score=50, repair=4500avg, replacement=10000avg → 45% < 50% threshold
  // but score < 60 so repair_recommended condition fails
  // score > 30 so replacement condition doesn't trigger
  // → neutral
  const result = computeRepairVsReplace({
    
    repairCostMinINR: 3000,
    repairCostMaxINR: 6000, // avg=4500
    replacementCostMinINR: 8000,
    replacementCostMaxINR: 12000, // avg=10000 → 4500/10000=45% < 50%
    
  });
  // score=50 (not ≥60 for repair_recommended), not ≤30, avgRepair(4500) < 0.8×10000(8000)
  assert.strictEqual(result.decision, 'neutral');
  console.log(`   [NEUTRAL] decision=${result.decision}, rationale="${result.rationale.substring(0, 50)}..."`);
});

test('[computeRepairVsReplace] confidence=high when isDemoData=false', () => {
  const result = computeRepairVsReplace({
    
    repairCostMinINR: 500,
    repairCostMaxINR: 1000,
    replacementCostMinINR: 30000,
    replacementCostMaxINR: 50000,
    isDemoData: false,
  });
  assert.strictEqual(result.confidence, 'high', 'Non-demo data should have high confidence');
  console.log(`   [HIGH CONFIDENCE] confidence=${result.confidence}`);
});

test('[computeRepairVsReplace] always includes rationale string', () => {
  for (const score of [20, 50, 85] as const) {
    const result = computeRepairVsReplace({
      score,
      repairCostMinINR: 1000,
      repairCostMaxINR: 2000,
      replacementCostMinINR: 30000,
      replacementCostMaxINR: 50000,
      
    });
    assert.ok(result.rationale && result.rationale.length > 0, `rationale must not be empty for score=${score}`);
  }
});

console.log('\n✓ All Repairability Engine + Repair-vs-Replace Engine unit tests will run.\n');
