import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { queryItems, TABLE_NAME } from '../lib/dynamoClient';
import { RepairHistoryItemSchema } from '../lib/schemas';
import { ok, internalError, unauthorized } from '../lib/responses';

export const handler: APIGatewayProxyHandlerV2 = async (event: APIGatewayProxyEventV2) => {
  try {
    const userId = (event.requestContext as any).authorizer?.jwt?.claims?.sub;
    if (!userId || typeof userId !== 'string') {
      return unauthorized();
    }

    const records = await queryItems<any>({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':skPrefix': 'HISTORY#',
      },
      ScanIndexForward: false, // Return newest first
    });

    const history = records.map((record) => {
      // Validate schema and strip internal DB keys
      return RepairHistoryItemSchema.parse({
        sessionId: record.sessionId,
        deviceId: record.deviceId,
        issueId: record.issueId,
        problemText: record.problemText,
        score: record.score,
        decision: record.decision,
        savedAt: record.savedAt,
      });
    });

    return ok({ history });
  } catch (error) {
    console.error('[listRepairHistory] Unexpected error:', error);
    return internalError('listing repair history');
  }
};
