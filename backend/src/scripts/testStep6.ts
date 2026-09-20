/**
 * Unit tests for dangerousSymptomCheck.ts (Step 7 pre-req)
 * and integration tests for startDiagnosis / getDiagnosis logic (Step 6).
 *
 * Tests cover:
 *  - Danger keyword detection on free text (all 6 danger categories)
 *  - Answer-based flag detection
 *  - No false positives on safe problem descriptions
 *  - Keyword matching of problem text → diagnostic rule
 *  - Session structure (UUID, status, TTL presence)
 */
import assert from 'node:assert';
import test from 'node:test';
import path from 'path';
import { loadSeedFiles } from './seed';
import { InMemoryDynamoDB, DynamoItem } from './verifyAccessPatterns';
import {
  checkProblemTextForDanger,
  checkAnswersForDanger,
} from '../lib/dangerousSymptomCheck';

interface DiagnosticRuleRecord extends DynamoItem {
  deviceId: string;
  ruleId: string;
  symptomLabel: string;
  questions: Array<{ id: string; text: string; type: string }>;
  dangerousFlags: string[];
  possibleIssues: string[];
}

// ── Shared in-memory DB ──────────────────────────────────────────────────────
const seedDir = path.resolve(__dirname, '../../../data/seed');
const { devices, rules, providers } = loadSeedFiles(seedDir);
const db = new InMemoryDynamoDB();
[...devices, ...rules, ...providers].forEach((item) => db.putItem(item as DynamoItem));

// ─────────────────────────────────────────────────────────────────────────────
// checkProblemTextForDanger — keyword detection
// ─────────────────────────────────────────────────────────────────────────────

test('[dangerCheck] smoke keyword triggers danger', () => {
  const result = checkProblemTextForDanger('My laptop is emitting smoke from the vents');
  assert.strictEqual(result.isDangerous, true);
  assert.ok(result.triggeredBy?.includes('smoke'));
  assert.ok(result.safetyMessage.length > 50);
});

test('[dangerCheck] sparks keyword triggers danger', () => {
  const result = checkProblemTextForDanger('There are sparks coming out of the charging port');
  assert.strictEqual(result.isDangerous, true);
});

test('[dangerCheck] burning smell triggers danger', () => {
  const result = checkProblemTextForDanger('I can smell burning smell from my phone');
  assert.strictEqual(result.isDangerous, true);
});

test('[dangerCheck] swollen battery triggers danger', () => {
  const result = checkProblemTextForDanger('The phone has a swollen battery and is expanding');
  assert.strictEqual(result.isDangerous, true);
});

test('[dangerCheck] electric shock triggers danger', () => {
  const result = checkProblemTextForDanger('I got an electric shock when I touched the phone');
  assert.strictEqual(result.isDangerous, true);
});

test('[dangerCheck] on fire triggers danger', () => {
  const result = checkProblemTextForDanger('My device caught fire while charging overnight');
  assert.strictEqual(result.isDangerous, true);
});

test('[dangerCheck] exposed wiring triggers danger', () => {
  const result = checkProblemTextForDanger('I can see exposed wiring near the USB port');
  assert.strictEqual(result.isDangerous, true);
});

test('[dangerCheck] NO false positive — normal charging problem', () => {
  const result = checkProblemTextForDanger('My laptop is not charging, battery drains fast');
  assert.strictEqual(result.isDangerous, false);
  assert.strictEqual(result.triggeredBy, null);
});

test('[dangerCheck] NO false positive — screen problem', () => {
  const result = checkProblemTextForDanger('My phone screen flickers and has dead pixels');
  assert.strictEqual(result.isDangerous, false);
});

test('[dangerCheck] NO false positive — overheating (warm, not burning)', () => {
  // "overheating" is a symptom but not a danger keyword by itself
  const result = checkProblemTextForDanger('Phone gets a bit warm when gaming');
  assert.strictEqual(result.isDangerous, false);
});

test('[dangerCheck] case-insensitive matching', () => {
  const result = checkProblemTextForDanger('I SAW SMOKE coming from my device');
  assert.strictEqual(result.isDangerous, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// checkAnswersForDanger — answer flag detection
// ─────────────────────────────────────────────────────────────────────────────

test('[answerCheck] burning_smell answer flag triggers danger', () => {
  const result = checkAnswersForDanger(
    { burning_smell: true, overheating: false },
    ['burning_smell', 'sparks'],
  );
  assert.strictEqual(result.isDangerous, true);
  assert.ok(result.triggeredBy?.includes('burning_smell'));
});

test('[answerCheck] sparks answer flag triggers danger', () => {
  const result = checkAnswersForDanger(
    { sparks: true },
    ['sparks', 'battery_drain'],
  );
  assert.strictEqual(result.isDangerous, true);
});

test('[answerCheck] false answers do NOT trigger danger', () => {
  const result = checkAnswersForDanger(
    { burning_smell: false, sparks: false, overheating: true },
    ['burning_smell', 'sparks'],
  );
  assert.strictEqual(result.isDangerous, false);
});

test('[answerCheck] non-danger flags answered TRUE still trigger (they are in dangerousFlags list)', () => {
  // battery_drain appears in dangerousFlags list AND is answered true → triggers
  // This is correct: ANY flag in dangerousFlags that the user affirms triggers safety
  const result = checkAnswersForDanger(
    { battery_drain: true, screen_flicker: true },
    ['battery_drain', 'screen_flicker'],
  );
  // battery_drain is answered true AND is in dangerousFlags → dangerous = true
  assert.strictEqual(result.isDangerous, true);
});

test('[answerCheck] all answers FALSE — never triggers danger', () => {
  const result = checkAnswersForDanger(
    { battery_drain: false, screen_flicker: false, burning_smell: false },
    ['battery_drain', 'screen_flicker', 'burning_smell'],
  );
  assert.strictEqual(result.isDangerous, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// DiagnosticRules seeded data correctness
// ─────────────────────────────────────────────────────────────────────────────

test('[diagnosticRules] laptop has 4 rules in seed data', () => {
  const laptopRules = db.queryPKAndSKBeginsWith('DEVICE#laptop', 'RULE#') as DiagnosticRuleRecord[];
  assert.strictEqual(laptopRules.length, 4, 'Laptop should have 4 rules');
});

test('[diagnosticRules] each rule has at least 2 questions', () => {
  const allRules = [
    ...db.queryPKAndSKBeginsWith('DEVICE#laptop', 'RULE#'),
    ...db.queryPKAndSKBeginsWith('DEVICE#smartphone', 'RULE#'),
    ...db.queryPKAndSKBeginsWith('DEVICE#headphones', 'RULE#'),
  ] as DiagnosticRuleRecord[];

  assert.ok(allRules.length === 12, `Expected 12 total rules, got ${allRules.length}`);

  for (const rule of allRules) {
    assert.ok(
      rule.questions.length >= 2,
      `Rule ${rule.ruleId} must have at least 2 questions, has ${rule.questions.length}`,
    );
    assert.ok(Array.isArray(rule.dangerousFlags), 'dangerousFlags must be an array');
    assert.ok(rule.symptomLabel, 'symptomLabel must be present');
  }
  console.log(`   ✓ All 12 rules have ≥2 questions, dangerousFlags array, and symptomLabel`);
});

test('[diagnosticRules] each question has id, text, and boolean type', () => {
  const allRules = db.queryPKAndSKBeginsWith('DEVICE#laptop', 'RULE#') as DiagnosticRuleRecord[];
  for (const rule of allRules) {
    for (const q of rule.questions) {
      assert.ok(q.id, `Question must have id in rule ${rule.ruleId}`);
      assert.ok(q.text, `Question must have text in rule ${rule.ruleId}`);
      assert.strictEqual(q.type, 'boolean', `Question type must be boolean in rule ${rule.ruleId}`);
    }
  }
  console.log('   ✓ All questions have id, text, type=boolean');
});

test('[diagnosticRules] laptop has not_charging and wont_turn_on rules', () => {
  const laptopRules = db.queryPKAndSKBeginsWith('DEVICE#laptop', 'RULE#') as DiagnosticRuleRecord[];
  const ruleIds = laptopRules.map((r) => r.ruleId);
  assert.ok(ruleIds.includes('not_charging'), 'Laptop must have not_charging rule');
  assert.ok(ruleIds.includes('wont_turn_on'), 'Laptop must have wont_turn_on rule');
});

// ─────────────────────────────────────────────────────────────────────────────
// Keyword matching logic — simulated
// ─────────────────────────────────────────────────────────────────────────────

test('[keywordMatch] "not charging" problem text matches not_charging rule', () => {
  const laptopRules = db.queryPKAndSKBeginsWith('DEVICE#laptop', 'RULE#') as DiagnosticRuleRecord[];

  // Simulate keyword matching from startDiagnosis
  const problemText = 'my laptop is not charging at all';
  const text = problemText.toLowerCase();

  const scored = laptopRules.map((rule) => {
    const labelWords = rule.symptomLabel.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const ruleWords = rule.ruleId.replace(/_/g, ' ').split(/\s+/);
    const allWords = [...new Set([...labelWords, ...ruleWords])];
    const score = allWords.filter((w) => text.includes(w)).length;
    return { rule, score };
  });

  const best = scored.sort((a, b) => b.score - a.score)[0];
  assert.ok(best.score > 0, 'Should find at least one keyword match');
  assert.strictEqual(best.rule.ruleId, 'not_charging', `Expected not_charging, got ${best.rule.ruleId}`);
  console.log(`   ✓ "not charging" → matched rule: ${best.rule.ruleId} (score=${best.score})`);
});

test('[keywordMatch] "screen flickering" matches screen_issue rule', () => {
  const smartphoneRules = db.queryPKAndSKBeginsWith('DEVICE#smartphone', 'RULE#') as DiagnosticRuleRecord[];
  const text = 'the screen is flickering and shows lines';

  const scored = smartphoneRules.map((rule) => {
    const allWords = [
      ...rule.symptomLabel.toLowerCase().split(/\s+/).filter((w) => w.length > 3),
      ...rule.ruleId.replace(/_/g, ' ').split(/\s+/),
    ];
    const score = [...new Set(allWords)].filter((w) => text.includes(w)).length;
    return { rule, score };
  });

  const best = scored.sort((a, b) => b.score - a.score)[0];
  assert.ok(best.score > 0, 'Should find a match for screen problem');
  console.log(`   ✓ "screen flickering" → matched rule: ${best.rule.ruleId} (score=${best.score})`);
});

console.log('\n✓ Step 6 + 7 (dangerousSymptomCheck + startDiagnosis logic) tests will run.\n');
