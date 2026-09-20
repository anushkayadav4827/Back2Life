import { getItem, putItem, TABLE_NAME } from './dynamoClient';
export interface PriceLookupResult {
  minINR: number;
  maxINR: number;
  source: 'cache' | 'live';
}

function getApiKey(): string | null {
  return process.env.SERPAPI_KEY || null;
}

/**
 * Fetches live pricing from SerpApi (Google Shopping)
 */
async function fetchLivePriceFromApi(brand: string, model: string, purchasePriceINR: number = 0): Promise<{ minINR: number; maxINR: number } | null> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.warn('[pricingLookup] Missing SerpApi key, falling back to category average.');
    return null;
  }

  try {
    const query = encodeURIComponent(`${brand} ${model} buy new`);
    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${query}&gl=in&hl=en&api_key=${apiKey}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[pricingLookup] SerpApi request failed with status: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const results = data.shopping_results;
    
    if (!results || results.length === 0) {
      console.warn(`[pricingLookup] No shopping results found for ${brand} ${model}`);
      return null;
    }

    // Extract prices from the first few relevant results
    let minPrice = Infinity;
    let maxPrice = 0;
    let validPrices = 0;
    
    const excludedKeywords = ['case', 'cover', 'glass', 'protector', 'cable', 'charger', 'battery', 'part', 'repair', 'screen', 'replacement', 'refurbished', 'preowned'];
    const minAllowedPrice = Math.max(3000, purchasePriceINR * 0.3);

    for (const item of results) {
      const title = (item.title || '').toLowerCase();
      
      const hasExcludedKeyword = excludedKeywords.some(kw => title.includes(kw));
      if (hasExcludedKeyword) continue;

      if (item.extracted_price && item.extracted_price >= minAllowedPrice) {
        minPrice = Math.min(minPrice, item.extracted_price);
        maxPrice = Math.max(maxPrice, item.extracted_price);
        validPrices++;
      }
      
      if (validPrices >= 5) break; // Consider up to 5 valid results
    }

    if (validPrices === 0) {
      return null;
    }

    if (minPrice === maxPrice) {
      return {
        minINR: Math.floor(minPrice * 0.95),
        maxINR: Math.floor(maxPrice * 1.05)
      };
    }

    return {
      minINR: Math.floor(minPrice),
      maxINR: Math.floor(maxPrice)
    };
  } catch (error) {
    console.error('[pricingLookup] Error calling SerpApi:', error);
    return null;
  }
}

export async function getLivePrice(brand: string, model: string, purchasePriceINR: number = 0): Promise<PriceLookupResult | null> {
  const cacheKey = `${brand}_${model}`.toUpperCase().replace(/\s+/g, '_');
  
  try {
    // 1. Check Cache
    const cachedRecord = await getItem<any>({
      TableName: TABLE_NAME,
      Key: { PK: `PRICECACHE#${cacheKey}`, SK: 'METADATA' },
    });

    // We rely on DynamoDB TTL to remove expired items, but we can also double check
    // Wait, if purchasePrice check fails for a cached low price, we shouldn't use it!
    if (cachedRecord && cachedRecord.ttl > Math.floor(Date.now() / 1000) && cachedRecord.minINR >= Math.max(3000, purchasePriceINR * 0.3)) {
      console.info(`[pricingLookup] Cache HIT for ${brand} ${model}`);
      return {
        minINR: cachedRecord.minINR,
        maxINR: cachedRecord.maxINR,
        source: 'cache',
      };
    }

    console.info(`[pricingLookup] Cache MISS or invalidated for ${brand} ${model}. Fetching live...`);

    // 2. Fetch from Live API
    const liveData = await fetchLivePriceFromApi(brand, model, purchasePriceINR);

    if (!liveData) {
      return null;
    }

    // 3. Cache the successful result with a 7-day TTL
    const ttl = Math.floor(Date.now() / 1000) + 7 * 86400; // 7 days in seconds
    
    await putItem({
      TableName: TABLE_NAME,
      Item: {
        PK: `PRICECACHE#${cacheKey}`,
        SK: 'METADATA',
        minINR: liveData.minINR,
        maxINR: liveData.maxINR,
        ttl,
        updatedAt: new Date().toISOString(),
      }
    });

    return {
      ...liveData,
      source: 'live',
    };
  } catch (error) {
    console.error(`[pricingLookup] Error fetching price for ${brand} ${model}:`, error);
    return null;
  }
}
