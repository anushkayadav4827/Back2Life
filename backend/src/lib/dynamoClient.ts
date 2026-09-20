import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  GetCommandInput,
  PutCommand,
  PutCommandInput,
  QueryCommand,
  QueryCommandInput,
  BatchWriteCommand,
  BatchWriteCommandInput,
} from '@aws-sdk/lib-dynamodb';

export const TABLE_NAME = process.env.TABLE_NAME || 'Back2LifeTable-dev';
const REGION = process.env.AWS_REGION || process.env.BEDROCK_REGION || 'ap-south-1';
const ENDPOINT = process.env.DYNAMODB_ENDPOINT;

const rawClient = new DynamoDBClient({
  region: REGION,
  ...(ENDPOINT ? { endpoint: ENDPOINT } : {}),
});

export const docClient = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

export async function getItem<T = Record<string, unknown>>(
  params: Omit<GetCommandInput, 'TableName'> & { TableName?: string },
): Promise<T | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: params.TableName || TABLE_NAME,
      ...params,
    }),
  );
  return (result.Item as T) || null;
}

export async function putItem(
  params: Omit<PutCommandInput, 'TableName'> & { TableName?: string },
): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: params.TableName || TABLE_NAME,
      ...params,
    }),
  );
}

export async function queryItems<T = Record<string, unknown>>(
  params: Omit<QueryCommandInput, 'TableName'> & { TableName?: string },
): Promise<T[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: params.TableName || TABLE_NAME,
      ...params,
    }),
  );
  return (result.Items as T[]) || [];
}

export async function batchWriteItems(
  items: Record<string, unknown>[],
  tableName: string = TABLE_NAME,
): Promise<void> {
  const CHUNK_SIZE = 25;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const putRequests = chunk.map((item) => ({
      PutRequest: { Item: item },
    }));

    const input: BatchWriteCommandInput = {
      RequestItems: {
        [tableName]: putRequests,
      },
    };

    await docClient.send(new BatchWriteCommand(input));
  }
}

export { rawClient };
