import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { ZodError } from 'zod';
import { queryItems, TABLE_NAME } from '../lib/dynamoClient';
import { ProviderSchema, Provider } from '../lib/schemas';
import { ok, validationError, internalError } from '../lib/responses';
import { getPlacesProviders } from '../lib/placesLookup';

interface ProviderDynamoRecord {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  providerId: string;
  isMockData: boolean;
  name: string;
  city: string;
  rating: number;
  categories: string[];
  contact: string;
}

const VALID_DEVICE_IDS = ['laptop', 'smartphone', 'headphones'];

export const handler: APIGatewayProxyHandlerV2 = async (event: APIGatewayProxyEventV2) => {
  try {
    const deviceId = event.queryStringParameters?.device;
    const city = event.queryStringParameters?.city;

    if (!deviceId) {
      return validationError('Query parameter "device" is required (e.g. ?device=laptop)');
    }

    if (!VALID_DEVICE_IDS.includes(deviceId)) {
      return validationError(
        `Unsupported device category. Must be one of: ${VALID_DEVICE_IDS.join(', ')}`,
      );
    }

    if (city) {
      const placesResult = await getPlacesProviders(city, deviceId);
      if (placesResult && placesResult.length > 0) {
        return ok({
          providers: placesResult,
          isMockData: false,
          disclaimerLabel: undefined,
        });
      }
    }

    const gsi1pk = `PROVIDERCAT#${deviceId}`;

    // GSI1 query — KeyConditionExpression can optionally filter by city prefix
    const records = await queryItems<ProviderDynamoRecord>({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: city
        ? 'GSI1PK = :gsi1pk AND begins_with(GSI1SK, :cityPrefix)'
        : 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: city
        ? { ':gsi1pk': gsi1pk, ':cityPrefix': `CITY#${city.toLowerCase()}` }
        : { ':gsi1pk': gsi1pk },
    });

    const providers: Provider[] = records.map((record) =>
      ProviderSchema.parse({
        providerId: record.providerId,
        isMockData: record.isMockData,
        name: record.name,
        city: record.city,
        rating: record.rating,
        categories: record.categories,
        contact: record.contact,
      }),
    );

    return ok({
      providers,
      isMockData: true,                    // Fallback providers are mock
      disclaimerLabel: 'Demo Providers — not verified real businesses',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('[listProviders] Validation error:', error.errors);
      return validationError('Provider data validation failed');
    }
    console.error('[listProviders] Unexpected error:', error);
    return internalError('listing providers');
  }
};
