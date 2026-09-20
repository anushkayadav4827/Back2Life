import { getItem, putItem, TABLE_NAME } from './dynamoClient';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const REGION = process.env.AWS_REGION || 'ap-south-1';
const secretsClient = new SecretsManagerClient({ region: REGION });

let cachedApiKey: string | null = null;

async function getApiKey(): Promise<string | null> {
  if (cachedApiKey) return cachedApiKey;

  try {
    const command = new GetSecretValueCommand({ SecretId: 'back2life/places-api-key' });
    const response = await secretsClient.send(command);
    
    if (response.SecretString) {
      cachedApiKey = response.SecretString;
      return cachedApiKey;
    }
  } catch (error) {
    console.error('[placesLookup] Error fetching secret from Secrets Manager:', error);
  }
  return null;
}

interface PlacesCache {
  PK: string;
  SK: string;
  city: string;
  deviceId: string;
  providers: any[];
  ttl: number;
}

export async function getPlacesProviders(city: string, deviceId: string) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.warn('[placesLookup] Missing Google Places API key, falling back to mock data.');
    return null;
  }

  const pk = `CACHE#PLACES`;
  const sk = `CITY#${city.toLowerCase()}_DEVICE#${deviceId.toLowerCase()}`;

  // 1. Check cache
  try {
    const cached = await getItem<PlacesCache>({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: sk },
    });
    
    // Check TTL (dynamo handles deletion eventually, but we check here too)
    if (cached && cached.ttl * 1000 > Date.now()) {
      console.info(`[placesLookup] Cache hit for ${city} ${deviceId}`);
      return cached.providers;
    }
  } catch (err) {
    console.error('[placesLookup] Error reading cache:', err);
  }

  // 2. Fetch from Google Places API
  console.info(`[placesLookup] Cache miss or expired for ${city} ${deviceId}. Calling Places API.`);
  const query = `${deviceId} repair in ${city}`;
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[placesLookup] Places API request failed with status: ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.warn(`[placesLookup] Places API error status: ${data.status}`);
      return null;
    }

    if (!data.results || data.results.length === 0) {
      return null; // Trigger fallback
    }

    // Map to our Provider schema shape
    const providers = data.results.slice(0, 10).map((p: any, i: number) => ({
      providerId: `place_${p.place_id || i}`,
      isMockData: false,
      name: p.name,
      city: city, // Normalize to requested city or could use formatted_address
      rating: p.rating || 0,
      categories: [deviceId],
      contact: p.formatted_address || '',
    }));

    // 3. Save to cache (TTL: 7 days)
    try {
      const ttl = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
      await putItem({
        TableName: TABLE_NAME,
        Item: {
          PK: pk,
          SK: sk,
          city,
          deviceId,
          providers,
          ttl,
        },
      });
    } catch (err) {
      console.error('[placesLookup] Error writing to cache:', err);
    }

    return providers;
  } catch (error) {
    console.error('[placesLookup] Error calling Places API:', error);
    return null;
  }
}
