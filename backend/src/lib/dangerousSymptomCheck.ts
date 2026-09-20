/**
 * dangerousSymptomCheck.ts
 *
 * Runs BEFORE any Bedrock call. Pure deterministic logic.
 * Per Rules.md §Architecture Rules:
 *   "Dangerous-symptom detection runs BEFORE any Bedrock call,
 *    as pure deterministic logic against DiagnosticRules.dangerousFlags."
 *
 * Two checks:
 *  1. Free-text problem description — scans for danger keywords (catches obvious cases early)
 *  2. Answer-based flag check — cross-references yes/no answers against rule's dangerousFlags
 *     (primary check, used in analyzeDiagnosis)
 */

/** Keywords that unconditionally trigger the safety interrupt per PRD.md §10 */
const DANGER_KEYWORDS: ReadonlyArray<RegExp> = [
  /\bsmoke\b/i,
  /\bsmoking\b/i,
  /\bsparks?\b/i,
  /\bsparkling\b/i,
  /\bburning\s+smell\b/i,
  /\bburnt\s+smell\b/i,
  /\bsmells?\s+burnt?\b/i,
  /\bswollen\s+battery\b/i,
  /\bbloated\s+battery\b/i,
  /\bbulging\s+battery\b/i,
  /\belectric\s+shock\b/i,
  /\belectrocute/i,
  /\bshock\s+me\b/i,
  /\bexposed\s+wir(e|ing)\b/i,
  /\bwire\s+exposed\b/i,
  /\bcaught\s+fire\b/i,
  /\bon\s+fire\b/i,
  /\bcatch\s+fire\b/i,
];

/** Answer flag IDs that are always dangerous (device/rule-agnostic) */
const DANGER_ANSWER_FLAGS: ReadonlySet<string> = new Set([
  'burning_smell',
  'sparks',
  'swollen_battery',
  'smoke',
  'electric_shock',
  'exposed_wiring',
  'hot_to_touch_battery',
  'extreme_heat',
  'hot_charging_port',
  'hot_to_touch',
  'exposed_frayed_wiring',
]);

export interface DangerCheckResult {
  isDangerous: boolean;
  triggeredBy: string | null;
  safetyMessage: string;
}

const SAFETY_MESSAGE =
  'STOP USE IMMEDIATELY. One or more of your described symptoms (smoke, sparks, ' +
  'burning smell, swollen battery, electric shock, or exposed wiring) indicates a ' +
  'potentially hazardous situation. Do NOT attempt to repair this device yourself. ' +
  'Disconnect it from power if safe to do so, keep it away from flammable materials, ' +
  'and take it to a qualified repair technician or certified e-waste disposal facility.';

/**
 * Check free-text problem description for danger keywords.
 * Called in startDiagnosis as an early-exit pre-check.
 */
export function checkProblemTextForDanger(problemText: string): DangerCheckResult {
  for (const pattern of DANGER_KEYWORDS) {
    if (pattern.test(problemText)) {
      return {
        isDangerous: true,
        triggeredBy: `keyword: ${pattern.source}`,
        safetyMessage: SAFETY_MESSAGE,
      };
    }
  }
  return { isDangerous: false, triggeredBy: null, safetyMessage: '' };
}

/**
 * Check structured yes/no answers against a rule's dangerous flags.
 * Called in analyzeDiagnosis BEFORE any Bedrock invocation.
 *
 * @param answers   - Record<answerId, boolean> from the user's diagnostic session
 * @param dangerousFlags - Array of flag IDs from the matched DiagnosticRule
 */
export function checkAnswersForDanger(
  answers: Record<string, boolean>,
  dangerousFlags: string[],
): DangerCheckResult {
  for (const flag of dangerousFlags) {
    // A flag triggers if it's either in the answers (set to true) or is a known universal danger flag
    if (answers[flag] === true || DANGER_ANSWER_FLAGS.has(flag)) {
      // Only dangerous if it was explicitly affirmed in the answers OR
      // if a universal danger flag appears in the rule's list
      if (answers[flag] === true) {
        return {
          isDangerous: true,
          triggeredBy: `answer flag: ${flag}`,
          safetyMessage: SAFETY_MESSAGE,
        };
      }
    }
  }
  return { isDangerous: false, triggeredBy: null, safetyMessage: '' };
}

/**
 * Combined check: runs both text and answer checks.
 * Returns on first match found (text check takes precedence).
 */
export function checkForDanger(
  problemText: string,
  answers: Record<string, boolean>,
  dangerousFlags: string[],
): DangerCheckResult {
  const textResult = checkProblemTextForDanger(problemText);
  if (textResult.isDangerous) return textResult;
  return checkAnswersForDanger(answers, dangerousFlags);
}
