import { z } from 'zod';

// ─── Diagnostic Question ───────────────────────────────────────────────────
export const DiagnosticQuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: z.literal('boolean'),
});
export type DiagnosticQuestion = z.infer<typeof DiagnosticQuestionSchema>;

// ─── Device ────────────────────────────────────────────────────────────────
export const DeviceSchema = z.object({
  deviceId: z.string(),
  name: z.string(),
  icon: z.string(),
  commonSymptoms: z.array(z.string()),
});
export type Device = z.infer<typeof DeviceSchema>;

// ─── DiagnosticRule ────────────────────────────────────────────────────────
export const DiagnosticRuleSchema = z.object({
  deviceId: z.string(),
  ruleId: z.string(),
  symptomLabel: z.string(),
  questions: z.array(DiagnosticQuestionSchema),
  dangerousFlags: z.array(z.string()),
  possibleIssues: z.array(z.string()),
});
export type DiagnosticRule = z.infer<typeof DiagnosticRuleSchema>;

// ─── RepairData ────────────────────────────────────────────────────────────
export const PartsAvailabilitySchema = z.enum(['GOOD', 'MEDIUM', 'POOR']);
export const RepairComplexitySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const RepairDataSchema = z.object({
  deviceId: z.string(),
  issueId: z.string(),
  issueLabel: z.string(),
  isDemoData: z.boolean(),
  partsAvailability: PartsAvailabilitySchema,
  repairComplexity: RepairComplexitySchema,
  repairCostMinINR: z.number().nonnegative(),
  repairCostMaxINR: z.number().nonnegative(),
  replacementCostMinINR: z.number().nonnegative(),
  replacementCostMaxINR: z.number().nonnegative(),
  expectedRepairTimeDays: z.number().int().nonnegative(),
  expectedRemainingUsabilityYears: z.number().nonnegative(),
});
export type RepairData = z.infer<typeof RepairDataSchema>;

// ─── Provider ──────────────────────────────────────────────────────────────
export const ProviderSchema = z.object({
  providerId: z.string(),
  isMockData: z.boolean(),
  name: z.string(),
  city: z.string(),
  rating: z.number().min(0).max(5),
  categories: z.array(z.string()),
  contact: z.string(),
});
export type Provider = z.infer<typeof ProviderSchema>;

// ─── DiagnosisSession ─────────────────────────────────────────────────────
export const SessionStatusSchema = z.enum(['IN_PROGRESS', 'COMPLETE', 'FAILED']);

export const ScoreBreakdownSchema = z.object({
  partsAvailabilityScore: z.number(),
  costRatioScore: z.number(),
  complexityScore: z.number(),
  ageFactorScore: z.number(),
  usabilityScore: z.number(),
});

export const ComparisonDecisionSchema = z.enum([
  'repair_recommended',
  'replacement_recommended',
  'neutral',
]);

export const StructuredArgumentSchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  bottomLine: z.string()
});

export const SynthesizedDiagnosisSchema = z.object({
  observed: z.string(),
  likelyCause: z.string(),
  recommendedFix: z.string(),
  outlook: z.string()
});

export const SessionResultSchema = z.object({
  likelyIssue: z.string().optional(),
  likelyIssueLabel: z.string().optional(),
  likelyIssueReason: SynthesizedDiagnosisSchema.optional(),
  otherPossibleCauses: z.array(z.string()).optional(),
  score: z.number().int().min(0).max(100).optional(),
  scoreBreakdown: ScoreBreakdownSchema.optional(),
  scoreBand: z.string().optional(),
  comparison: ComparisonDecisionSchema.optional(),
  confidence: z.enum(['high', 'demo_estimate']).optional(),
  repairCostRange: z.object({ minINR: z.number(), maxINR: z.number() }).optional(),
  replacementCostRange: z.object({ minINR: z.number(), maxINR: z.number() }).optional(),
  safetyWarning: z.boolean().optional(),
  safetyMessage: z.string().optional(),
  debate: z.object({
    repairArgument: StructuredArgumentSchema,
    replaceArgument: StructuredArgumentSchema,
    winner: z.enum(['REPAIR', 'REPLACE', 'NEUTRAL']),
  }).optional(),
});

export const IntakeDataSchema = z.object({
  brand: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  ageYears: z.number().nonnegative(),
  purchasePriceINR: z.number().nonnegative(),
  warrantyStatus: z.enum(['IN_WARRANTY', 'OUT_OF_WARRANTY', 'UNSURE']),
  warrantyExpiry: z.string().optional(),
  priorRepairs: z.enum(['NONE', '1', '2+']),
  usageIntensity: z.enum(['LIGHT', 'MODERATE', 'HEAVY']),
  budgetINR: z.number().nonnegative().optional(),
});
export type IntakeData = z.infer<typeof IntakeDataSchema>;

export const DiagnosisSessionSchema = z.object({
  sessionId: z.string().uuid(),
  deviceId: z.string(),
  problemText: z.string().max(300),
  intakeData: IntakeDataSchema.optional(),
  answers: z.record(z.boolean()),
  status: SessionStatusSchema,
  result: SessionResultSchema.optional(),
  totalQuestionsAsked: z.number().int().optional(),
  usedFallbackQuestions: z.boolean().optional(),
  generatedQuestions: z.array(DiagnosticQuestionSchema).optional(),
  createdAt: z.string().datetime(),
  ttl: z.number().int().optional(),
});
export type DiagnosisSession = z.infer<typeof DiagnosisSessionSchema>;

// ─── RepairHistory ────────────────────────────────────────────────────────
export const RepairHistoryItemSchema = z.object({
  sessionId: z.string(),
  deviceId: z.string(),
  issueId: z.string(),
  problemText: z.string().optional(),
  score: z.number().int().min(0).max(100).optional(),
  decision: ComparisonDecisionSchema.optional(),
  savedAt: z.string().datetime(),
});
export type RepairHistoryItem = z.infer<typeof RepairHistoryItemSchema>;

// ─── API Request schemas ──────────────────────────────────────────────────


export const StartDiagnosisRequestSchema = z.object({
  deviceId: z.string().min(1),
  problemText: z.string().min(1).max(300),
  symptomId: z.string().optional(),
  intakeData: IntakeDataSchema.optional(), // Make optional for backward compatibility
});
export type StartDiagnosisRequest = z.infer<typeof StartDiagnosisRequestSchema>;

export const AnalyzeDiagnosisRequestSchema = z.object({
  sessionId: z.string().uuid(),
  answers: z.record(z.boolean()),
  deviceAgeYears: z.number().nonnegative().optional(),
});
export type AnalyzeDiagnosisRequest = z.infer<typeof AnalyzeDiagnosisRequestSchema>;

export const SaveRepairHistoryRequestSchema = z.object({
  sessionId: z.string().uuid(),
});
export type SaveRepairHistoryRequest = z.infer<typeof SaveRepairHistoryRequestSchema>;

// ─── LLM output schema ────────────────────────────────────────────────
export const LLMLikelyIssueSchema = z.object({
  issue: z.string(),
  likelihood: z.enum(['high', 'medium', 'low']),
  reason: z.string().max(500),
});

export const LLMOutputSchema = z.object({
  status: z.enum(['NEEDS_INFO', 'COMPLETE']),
  newQuestions: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
    })
  ).optional(),
  result: z.object({
    primaryIssue: z.string(),
    reason: SynthesizedDiagnosisSchema,
    debate: z.object({
      repairArgument: StructuredArgumentSchema,
      replaceArgument: StructuredArgumentSchema,
      winner: z.enum(['REPAIR', 'REPLACE', 'NEUTRAL']).catch('REPLACE'),
    }),
    safetyWarning: z.string().nullable(),
  }).optional(),
});
export type LLMOutput = z.infer<typeof LLMOutputSchema>;
