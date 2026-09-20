import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { ZodError } from 'zod';
import { getItem, TABLE_NAME } from '../lib/dynamoClient';
import { DeviceSchema, Device } from '../lib/schemas';
import { ok, notFound, internalError, validationError } from '../lib/responses';

interface DeviceDynamoRecord {
  PK: string;
  SK: string;
  deviceId: string;
  name: string;
  icon: string;
  commonSymptoms: string[];
}

const VALID_DEVICE_IDS = ['laptop', 'smartphone', 'headphones'];

export const handler: APIGatewayProxyHandlerV2 = async (event: APIGatewayProxyEventV2) => {
  try {
    const deviceId = event.pathParameters?.deviceId;

    if (!deviceId) {
      return validationError('deviceId path parameter is required');
    }

    if (!VALID_DEVICE_IDS.includes(deviceId)) {
      return validationError(
        `Unsupported device. Must be one of: ${VALID_DEVICE_IDS.join(', ')}`,
      );
    }

    const record = await getItem<DeviceDynamoRecord>({
      TableName: TABLE_NAME,
      Key: {
        PK: `DEVICE#${deviceId}`,
        SK: 'METADATA',
      },
    });

    if (!record) {
      return notFound(`Device '${deviceId}'`);
    }

    const device: Device = DeviceSchema.parse({
      deviceId: record.deviceId,
      name: record.name,
      icon: record.icon,
      commonSymptoms: record.commonSymptoms,
    });

    return ok({ device });
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('[getDevice] Validation error on DynamoDB data:', error.errors);
      return validationError('Device data validation failed');
    }
    console.error('[getDevice] Unexpected error:', error);
    return internalError('retrieving device');
  }
};
