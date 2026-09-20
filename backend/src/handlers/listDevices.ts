import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { ZodError } from 'zod';
import { docClient, TABLE_NAME } from '../lib/dynamoClient';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { DeviceSchema, Device } from '../lib/schemas';
import { ok, internalError, validationError } from '../lib/responses';

interface DeviceDynamoRecord {
  PK: string;
  SK: string;
  deviceId: string;
  name: string;
  icon: string;
  commonSymptoms: string[];
}

function mapToDto(record: DeviceDynamoRecord): Device {
  return DeviceSchema.parse({
    deviceId: record.deviceId,
    name: record.name,
    icon: record.icon,
    commonSymptoms: record.commonSymptoms,
  });
}

export const handler: APIGatewayProxyHandlerV2 = async (
  _event: APIGatewayProxyEventV2,
) => {
  try {
    // Scan with filter: PK begins_with 'DEVICE#' AND SK = 'METADATA'
    // Only 3 devices exist at MVP — scan is perfectly acceptable at this scale
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :pkPrefix) AND SK = :sk',
        ExpressionAttributeValues: {
          ':pkPrefix': 'DEVICE#',
          ':sk': 'METADATA',
        },
      }),
    );

    const records = (result.Items || []) as DeviceDynamoRecord[];
    const devices: Device[] = records.map(mapToDto);

    return ok({ devices });
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('[listDevices] Validation error on DynamoDB data:', error.errors);
      return validationError('Device data validation failed');
    }
    console.error('[listDevices] Unexpected error:', error);
    return internalError('listing devices');
  }
};
