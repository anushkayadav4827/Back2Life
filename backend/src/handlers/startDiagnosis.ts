import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { ZodError } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getItem, queryItems, putItem, TABLE_NAME } from '../lib/dynamoClient';
import { StartDiagnosisRequestSchema, DiagnosticQuestion } from '../lib/schemas';
import {
  ok,
  notFound,
  internalError,
  validationError,
  unauthorized,
} from '../lib/responses';
import { checkProblemTextForDanger } from '../lib/dangerousSymptomCheck';

interface DiagnosticRuleRecord {
  PK: string;
  SK: string;
  deviceId: string;
  ruleId: string;
  symptomLabel: string;
  questions: DiagnosticQuestion[];
  dangerousFlags: string[];
  possibleIssues: string[];
}

interface DeviceRecord {
  PK: string;
  SK: string;
  deviceId: string;
  name: string;
  commonSymptoms: string[];
}

/** Keyword-based symptom matching for problem text → ruleId */
function matchSymptomFromText(problemText: string, rules: DiagnosticRuleRecord[]): DiagnosticRuleRecord | null {
  const text = problemText.toLowerCase();

  // Score each rule by how many keywords from its symptomLabel appear in the problem text
  let bestRule: DiagnosticRuleRecord | null = null;
  let bestScore = 0;

  for (const rule of rules) {
    const labelWords = rule.symptomLabel.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const ruleWords = rule.ruleId.replace(/_/g, ' ').split(/\s+/);
    const allWords = [...new Set([...labelWords, ...ruleWords])];

    let score = 0;
    for (const word of allWords) {
      if (text.includes(word)) score++;
    }

    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }

  // Only use keyword match if there's at least one keyword match
  return bestScore > 0 ? bestRule : null;
}

export const handler: APIGatewayProxyHandlerV2 = async (event: APIGatewayProxyEventV2) => {
  try {
    const userId = (event.requestContext as any).authorizer?.jwt?.claims?.sub;
    if (!userId || typeof userId !== 'string') {
      return unauthorized();
    }

    // 1. Parse and validate input
    let body: unknown;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return validationError('Request body must be valid JSON');
    }

    const parseResult = StartDiagnosisRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return validationError(parseResult.error.issues.map((i) => i.message).join('; '));
    }

    const { deviceId, problemText, symptomId, intakeData } = parseResult.data;

    // 2. Verify device exists
    const device = await getItem<DeviceRecord>({
      TableName: TABLE_NAME,
      Key: { PK: `DEVICE#${deviceId}`, SK: 'METADATA' },
    });

    if (!device) {
      return notFound(`Device '${deviceId}'`);
    }

    // 3. Early danger check on problem text (before DynamoDB rule lookup)
    const dangerCheck = checkProblemTextForDanger(problemText);
    if (dangerCheck.isDangerous) {
      console.warn(`[startDiagnosis] Safety interrupt triggered by problem text. Flag: ${dangerCheck.triggeredBy}`);
      const sessionId = uuidv4();
      const now = new Date().toISOString();
      const ttl = Math.floor(Date.now() / 1000) + 30 * 86400;

      // Still persist the session so history works
      await putItem({
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${userId}`,
          SK: `SESSION#${sessionId}`,
          sessionId,
          deviceId,
          problemText,
          intakeData,
          answers: {},
          status: 'FAILED',
          result: {
            safetyWarning: true,
            safetyMessage: dangerCheck.safetyMessage,
          },
          createdAt: now,
          ttl,
        },
      });

      return ok({
        sessionId,
        safetyWarning: true,
        safetyMessage: dangerCheck.safetyMessage,
        questions: [],
      });
    }

    // 4. Load all diagnostic rules for this device
    const rules = await queryItems<DiagnosticRuleRecord>({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `DEVICE#${deviceId}`,
        ':skPrefix': 'RULE#',
      },
    });

    if (rules.length === 0) {
      return notFound(`Diagnostic rules for device '${deviceId}'`);
    }

    // 5. Match symptom → rule
    let matchedRule: DiagnosticRuleRecord | null = null;

    if (symptomId) {
      // Direct lookup — frontend passes the specific symptomId the user tapped
      matchedRule = rules.find((r) => r.ruleId === symptomId) || null;
    }

    if (!matchedRule) {
      // Keyword match fallback from free-text description
      matchedRule = matchSymptomFromText(problemText, rules);
    }

    if (!matchedRule) {
      // Fallback: use first rule for the device (avoids dead-end for hackathon demo)
      matchedRule = rules[0];
    }

    // 6. Create DiagnosisSession (status = IN_PROGRESS)
    const sessionId = uuidv4();
    const now = new Date().toISOString();
    const ttl = Math.floor(Date.now() / 1000) + 30 * 86400; // 30-day TTL

    // Remove undefined values to avoid DynamoDB errors
    const sessionItem: any = {
      PK: `USER#${userId}`,
      SK: `SESSION#${sessionId}`,
      sessionId,
      deviceId,
      problemText,
      ruleId: matchedRule.ruleId,
      answers: {},
      status: 'IN_PROGRESS',
      totalQuestionsAsked: matchedRule.questions.length,
      usedFallbackQuestions: false,
      generatedQuestions: [],
      createdAt: now,
      ttl,
    };
    if (intakeData) sessionItem.intakeData = intakeData;

    await putItem({
      TableName: TABLE_NAME,
      Item: sessionItem,
    });

    console.info(
      `[startDiagnosis] Created session ${sessionId} for device=${deviceId}, ruleId=${matchedRule.ruleId}`,
    );

    return ok({
      sessionId,
      safetyWarning: false,
      ruleId: matchedRule.ruleId,
      symptomLabel: matchedRule.symptomLabel,
      questions: matchedRule.questions,
      dangerousFlags: matchedRule.dangerousFlags,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error.issues.map((i) => i.message).join('; '));
    }
    console.error('[startDiagnosis] Unexpected error:', error);
    return internalError('starting diagnosis');
  }
};
