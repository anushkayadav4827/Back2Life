import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { ZodError } from 'zod';
import { getItem, putItem, queryItems, TABLE_NAME } from '../lib/dynamoClient';
import {
  AnalyzeDiagnosisRequestSchema,
  DiagnosticQuestion,
} from '../lib/schemas';
import { ok, notFound, internalError, validationError, unauthorized } from '../lib/responses';
import { checkAnswersForDanger } from '../lib/dangerousSymptomCheck';
import { getDiagnosisFromAI } from '../lib/llmClient';
import { computeRepairabilityScore, RepairabilityInput } from '../lib/repairabilityEngine';
import { computeRepairVsReplace, RepairVsReplaceInput } from '../lib/repairVsReplaceEngine';

// Simplified interfaces for DynamoDB records
interface DiagnosticRuleRecord {
  ruleId: string;
  symptomLabel: string;
  questions: DiagnosticQuestion[];
  dangerousFlags: string[];
  possibleIssues: string[];
}

interface RepairDataRecord {
  issueId: string;
  issueLabel: string;
  isDemoData: boolean;
  partsAvailability: 'GOOD' | 'MEDIUM' | 'POOR';
  repairComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  repairCostMinINR: number;
  repairCostMaxINR: number;
  replacementCostMinINR: number;
  replacementCostMaxINR: number;
  expectedRepairTimeDays: number;
  expectedRemainingUsabilityYears: number;
}

export const handler: APIGatewayProxyHandlerV2 = async (event: APIGatewayProxyEventV2) => {
  try {
    const userId = (event.requestContext as any).authorizer?.jwt?.claims?.sub;
    if (!userId || typeof userId !== 'string') {
      return unauthorized();
    }

    // 1. Validate request
    let body: unknown;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return validationError('Request body must be valid JSON');
    }

    const parseResult = AnalyzeDiagnosisRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return validationError(parseResult.error.issues.map((i) => i.message).join('; '));
    }

    const { sessionId, answers, deviceAgeYears } = parseResult.data;

    // 2. Fetch session
    const sessionRecord = await getItem<Record<string, unknown>>({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `SESSION#${sessionId}` },
    });

    if (!sessionRecord) {
      return notFound(`Diagnosis session '${sessionId}'`);
    }

    if (sessionRecord.status !== 'IN_PROGRESS') {
      return validationError(`Session '${sessionId}' is already ${sessionRecord.status}`);
    }

    const deviceId = sessionRecord.deviceId as string;
    const ruleId = sessionRecord.ruleId as string;
    const problemText = sessionRecord.problemText as string;

    // 3. Fetch device & rule
    const deviceRecord = await getItem<{ name: string }>({
      TableName: TABLE_NAME,
      Key: { PK: `DEVICE#${deviceId}`, SK: 'METADATA' },
    });

    if (!deviceRecord) {
      return internalError('loading device data');
    }

    const rules = await queryItems<DiagnosticRuleRecord>({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: {
        ':pk': `DEVICE#${deviceId}`,
        ':sk': `RULE#${ruleId}`,
      },
    });

    const rule = rules[0];
    if (!rule) {
      return internalError(`loading rule data for ${ruleId}`);
    }

    // 4. Safety Check (Deterministic before Bedrock)
    const dangerCheck = checkAnswersForDanger(answers, rule.dangerousFlags);
    if (dangerCheck.isDangerous) {
      console.warn(`[analyzeDiagnosis] Safety interrupt triggered on answers for session ${sessionId}`);
      
      const failedResult = {
        safetyWarning: true,
        safetyMessage: dangerCheck.safetyMessage,
      };

      await putItem({
        TableName: TABLE_NAME,
        Item: {
          ...sessionRecord,
          answers,
          status: 'FAILED',
          result: failedResult,
        },
      });

      return ok(failedResult);
    }

    // 4.5 Fetch Live Price & Repair Data
    
    const brand = (sessionRecord.intakeData as any)?.brand || deviceRecord.name.split(' ')[0];
    const model = (sessionRecord.intakeData as any)?.model || deviceRecord.name;
    
    // Lazy load the import to avoid top level change if possible, actually let's just require it
    const { getLivePrice } = require('../lib/pricingLookup');
    const purchasePrice = (sessionRecord.intakeData as any)?.purchasePriceINR || 0;
    const livePrice = await getLivePrice(brand, model, purchasePrice);

    // 5. Fetch RepairData for ALL possible issues
    const possibleIssuesOptions = [];
    let fallbackRepairData: RepairDataRecord | null = null;

    if (rule.possibleIssues && rule.possibleIssues.length > 0) {
      const keys = rule.possibleIssues.map(id => ({ PK: `DEVICE#${deviceId}`, SK: `REPAIRDATA#${id}` }));
      
      // Batch get items (for simplicity in this iteration, we'll just fetch them sequentially as there are usually only 2-4)
      for (const key of keys) {
        const repairData = await getItem<RepairDataRecord>({ TableName: TABLE_NAME, Key: key });
        if (repairData) {
          if (!fallbackRepairData) fallbackRepairData = repairData;
          
          let replacementMinINR = repairData.replacementCostMinINR;
          let replacementMaxINR = repairData.replacementCostMaxINR;
          let source: 'live' | 'cache' | 'category_average' = 'category_average';

          if (livePrice) {
            replacementMinINR = livePrice.minINR;
            replacementMaxINR = livePrice.maxINR;
            source = livePrice.source;
          }

          const pricingData = {
            replacementMinINR,
            replacementMaxINR,
            repairMinINR: repairData.repairCostMinINR,
            repairMaxINR: repairData.repairCostMaxINR,
            source,
          };

          const arbitrationInput: RepairVsReplaceInput = {
            repairCostMinINR: repairData.repairCostMinINR,
            repairCostMaxINR: repairData.repairCostMaxINR,
            replacementCostMinINR: pricingData.replacementMinINR,
            replacementCostMaxINR: pricingData.replacementMaxINR || pricingData.replacementMinINR,
            partsAvailability: repairData.partsAvailability,
            priorRepairs: (sessionRecord.intakeData as any)?.priorRepairs || 'NONE',
            warrantyStatus: (sessionRecord.intakeData as any)?.warrantyStatus || 'OUT_OF_WARRANTY',
            expectedRemainingUsabilityYears: repairData.expectedRemainingUsabilityYears,
            purchasePriceINR: (sessionRecord.intakeData as any)?.purchasePriceINR || 0,
          };
          
          const arbitrationResult = computeRepairVsReplace(arbitrationInput);

          possibleIssuesOptions.push({
            id: repairData.issueId,
            label: repairData.issueLabel,
            pricingData,
            arbitrationResult,
            repairData // keep it around for the score calculation later
          });
        }
      }
    }

    const generatedQuestions = (sessionRecord.generatedQuestions as DiagnosticQuestion[]) || [];
    const allQuestions = [...rule.questions, ...generatedQuestions];
    
    const questionsAndAnswers = allQuestions.map((q) => ({
      question: q.text,
      answer: answers[q.id] ?? false,
    }));

    const totalQuestionsAsked = allQuestions.length;
    const forceComplete = totalQuestionsAsked >= 10 || !!sessionRecord.usedFallbackQuestions;

    // 6. Call AI
    console.info(`[analyzeDiagnosis] Calling AI for session ${sessionId}...`);
    const aiOutput = await getDiagnosisFromAI({
      device: deviceRecord.name,
      problemText,
      ruleSymptom: rule.symptomLabel,
      questionsAndAnswers,
      intakeData: sessionRecord.intakeData,
      possibleIssues: possibleIssuesOptions,
      forceComplete,
    });
    
    const isFallback = aiOutput.result?.primaryIssue === 'Analysis Unavailable';

    if (aiOutput.status === 'NEEDS_INFO') {
      const newGeneratedQuestions = aiOutput.newQuestions || [];
      const updatedGeneratedQuestions = [...generatedQuestions, ...newGeneratedQuestions];

      await putItem({
        TableName: TABLE_NAME,
        Item: {
          ...sessionRecord,
          answers,
          totalQuestionsAsked: rule.questions.length + updatedGeneratedQuestions.length,
          generatedQuestions: updatedGeneratedQuestions,
        },
      });

      return ok({
        status: 'NEEDS_INFO',
        newQuestions: newGeneratedQuestions,
      });
    }

    // Status is COMPLETE
    const llmResult = aiOutput.result;
    if (!llmResult) {
      return internalError('AI output missing result');
    }

    const primaryIssue = { issue: llmResult.primaryIssue, reason: llmResult.reason };

    // 7. Extract the chosen RepairData based on LLM output
    let chosenOption = possibleIssuesOptions.find(o => o.id === (llmResult as any).primaryIssueId);
    if (!chosenOption && possibleIssuesOptions.length > 0) {
      chosenOption = possibleIssuesOptions[0]; // fallback
    }

    let fallbackIssueLabel = primaryIssue.issue;
    if (chosenOption) {
      fallbackIssueLabel = chosenOption.label;
    }

    // 8. Calculate Scores
    let engineScoreData: any = {};
    if (chosenOption) {
      const repairData = chosenOption.repairData;
      
      const repairabilityInput: RepairabilityInput = {
        partsAvailability: repairData.partsAvailability,
        repairComplexity: repairData.repairComplexity,
        repairCostMinINR: repairData.repairCostMinINR,
        repairCostMaxINR: repairData.repairCostMaxINR,
        replacementCostMinINR: repairData.replacementCostMinINR,
        replacementCostMaxINR: repairData.replacementCostMaxINR,
        expectedRemainingUsabilityYears: repairData.expectedRemainingUsabilityYears,
        deviceAgeYears: (sessionRecord.intakeData as any)?.ageYears ?? deviceAgeYears ?? 2,
        priorRepairs: (sessionRecord.intakeData as any)?.priorRepairs || 'NONE',
      };

      const repairabilityResult = computeRepairabilityScore(repairabilityInput);
      
      if (repairabilityResult.success) {
        engineScoreData = {
          score: repairabilityResult.score,
          scoreBreakdown: repairabilityResult.breakdown,
          scoreBand: repairabilityResult.scoreBand,
          comparison: chosenOption.arbitrationResult?.decision || 'neutral',
          confidence: 'high',
          repairCostRange: { minINR: repairData.repairCostMinINR, maxINR: repairData.repairCostMaxINR },
          replacementCostRange: { minINR: chosenOption.pricingData.replacementMinINR, maxINR: chosenOption.pricingData.replacementMaxINR },
          isLivePrice: chosenOption.pricingData.source !== 'category_average',
          repairCostPerYear: chosenOption.arbitrationResult?.repairCostPerYear,
          replaceCostPerYear: chosenOption.arbitrationResult?.replaceCostPerYear,
          priorRepairsPenalty: repairabilityInput.priorRepairs === '1' ? '10% reduction' : (repairabilityInput.priorRepairs === '2+' ? '20% reduction' : null),
        };
      }
    }

    // 9. Assemble Final Result
    const finalResult = {
      likelyIssue: primaryIssue.issue,
      likelyIssueLabel: fallbackIssueLabel,
      likelyIssueReason: primaryIssue.reason,
      otherPossibleCauses: [], // Removed in new schema
      safetyWarning: llmResult.safetyWarning ? true : false,
      safetyMessage: llmResult.safetyWarning || undefined,
      debate: llmResult.debate,
      ...engineScoreData,
    };

    // Strip out undefined values to satisfy DynamoDB document client
    const cleanResult = JSON.parse(JSON.stringify(finalResult));

    // 10. Persist Session
    await putItem({
      TableName: TABLE_NAME,
      Item: {
        ...sessionRecord,
        answers, // update session with the answers that drove this diagnosis
        status: 'COMPLETE',
        totalQuestionsAsked,
        usedFallbackQuestions: isFallback,
        result: cleanResult,
      },
    });

    console.info(`[analyzeDiagnosis] Session ${sessionId} complete with score: ${engineScoreData.score || 'N/A'}`);

    return ok(cleanResult);
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error.issues.map((i) => i.message).join('; '));
    }
    console.error('[analyzeDiagnosis] Unexpected error:', error);
    return internalError('analyzing diagnosis');
  }
};
