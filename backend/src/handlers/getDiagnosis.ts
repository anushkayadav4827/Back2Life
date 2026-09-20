import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { getItem, TABLE_NAME } from '../lib/dynamoClient';
import { DiagnosisSessionSchema } from '../lib/schemas';
import { ok, notFound, internalError, validationError, unauthorized } from '../lib/responses';
import { ZodError } from 'zod';

export const handler: APIGatewayProxyHandlerV2 = async (event: APIGatewayProxyEventV2) => {
  try {
    const userId = (event.requestContext as any).authorizer?.jwt?.claims?.sub;
    if (!userId || typeof userId !== 'string') {
      return unauthorized();
    }

    const sessionId = event.pathParameters?.id;

    if (!sessionId) {
      return validationError('sessionId path parameter is required');
    }

    // Basic UUID format check
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(sessionId)) {
      return validationError('sessionId must be a valid UUID v4');
    }

    const record = await getItem<Record<string, unknown>>({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `SESSION#${sessionId}`,
      },
    });

    if (!record) {
      return notFound(`Diagnosis session '${sessionId}'`);
    }

    // Validate the record against our session schema — strips PK/SK automatically via Zod
    const session = DiagnosisSessionSchema.parse({
      sessionId: record.sessionId,
      deviceId: record.deviceId,
      problemText: record.problemText,
      answers: record.answers ?? {},
      status: record.status,
      result: record.result,
      createdAt: record.createdAt,
      ttl: record.ttl,
    });

    return ok({ session });
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('[getDiagnosis] Session data validation error:', error.errors);
      return validationError('Session data is malformed');
    }
    console.error('[getDiagnosis] Unexpected error:', error);
    return internalError('retrieving diagnosis session');
  }
};
