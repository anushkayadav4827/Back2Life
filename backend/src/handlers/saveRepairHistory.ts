import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { ZodError } from 'zod';
import { getItem, putItem, TABLE_NAME } from '../lib/dynamoClient';
import { SaveRepairHistoryRequestSchema } from '../lib/schemas';
import { ok, notFound, internalError, validationError, unauthorized } from '../lib/responses';

export const handler: APIGatewayProxyHandlerV2 = async (event: APIGatewayProxyEventV2) => {
  try {
    const userId = (event.requestContext as any).authorizer?.jwt?.claims?.sub;
    console.info(`[saveRepairHistory] Invoked. userId from JWT: ${userId}`);
    if (!userId || typeof userId !== 'string') {
      console.warn(`[saveRepairHistory] Unauthorized. JWT claims sub is missing or invalid.`);
      return unauthorized();
    }

    let body: unknown;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return validationError('Request body must be valid JSON');
    }

    const parseResult = SaveRepairHistoryRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return validationError(parseResult.error.issues.map((i) => i.message).join('; '));
    }

    const { sessionId } = parseResult.data;

    // Load the session
    console.info(`[saveRepairHistory] Looking up session ${sessionId} for user ${userId}`);
    const sessionRecord = await getItem<any>({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `SESSION#${sessionId}` },
    });

    if (!sessionRecord) {
      console.warn(`[saveRepairHistory] Session ${sessionId} not found for user ${userId}`);
      return notFound(`Diagnosis session '${sessionId}'`);
    }

    console.info(`[saveRepairHistory] Found session. Status: ${sessionRecord.status}`);

    if (sessionRecord.status !== 'COMPLETE') {
      return validationError(`Session '${sessionId}' is not COMPLETE (status: ${sessionRecord.status})`);
    }

    const savedAt = new Date().toISOString();

    // Map the history record
    const historyItem = {
      PK: `USER#${userId}`,
      SK: `HISTORY#${savedAt}`,
      sessionId: sessionRecord.sessionId,
      deviceId: sessionRecord.deviceId,
      issueId: sessionRecord.result?.likelyIssueLabel || 'Unknown Issue',
      problemText: sessionRecord.problemText,
      score: sessionRecord.result?.score,
      decision: sessionRecord.result?.comparison,
      savedAt,
    };

    // Strip undefined
    const cleanHistoryItem = JSON.parse(JSON.stringify(historyItem));

    console.info(`[saveRepairHistory] Writing history item to DynamoDB:`, JSON.stringify(cleanHistoryItem));
    await putItem({
      TableName: TABLE_NAME,
      Item: cleanHistoryItem,
    });
    console.info(`[saveRepairHistory] Successfully wrote history item.`);

    return ok({ message: 'History saved successfully' }, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error.issues.map((i) => i.message).join('; '));
    }
    console.error('[saveRepairHistory] Unexpected error:', error);
    return internalError('saving repair history');
  }
};
