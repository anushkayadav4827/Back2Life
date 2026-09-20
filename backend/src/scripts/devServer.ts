import express from 'express';
import cors from 'cors';
import path from 'path';
import { loadSeedFiles } from './seed';
import { InMemoryDynamoDB, DynamoItem } from './verifyAccessPatterns';

// Mock the dynamo client before importing handlers
const db = new InMemoryDynamoDB();

const dynamoClient = require('../lib/dynamoClient');
dynamoClient.getItem = async (params: any) => {
  return db.getItem(params.Key.PK, params.Key.SK);
};
dynamoClient.putItem = async (params: any) => {
  db.putItem(params.Item as DynamoItem);
};
dynamoClient.queryItems = async (params: any) => {
  if (params.KeyConditionExpression === 'PK = :pk AND SK = :sk') {
    const item = db.getItem(params.ExpressionAttributeValues[':pk'], params.ExpressionAttributeValues[':sk']);
    return item ? [item] : [];
  }
  if (params.KeyConditionExpression === 'PK = :pk AND begins_with(SK, :skPrefix)') {
    return db.queryPKAndSKBeginsWith(params.ExpressionAttributeValues[':pk'], params.ExpressionAttributeValues[':skPrefix']);
  }
  if (params.IndexName === 'GSI1') {
    const GSI1PK = params.ExpressionAttributeValues[':gsi1pk'];
    const GSI1SK = params.ExpressionAttributeValues[':gsi1skPrefix'];
    return db.queryGSI1(GSI1PK, GSI1SK);
  }
  return [];
};

dynamoClient.docClient = {
  send: async (command: any) => {
    // Intercept ScanCommand for listDevices
    if (command.constructor.name === 'ScanCommand') {
      const items = db.scan();
      return { Items: items.filter((item: any) => item.PK.startsWith('DEVICE#') && item.SK === 'METADATA') };
    }
    // Intercept ScanCommand for listProviders
    if (command.constructor.name === 'ScanCommand' && command.input.FilterExpression?.includes('PROVIDER#')) {
      const items = db.scan();
      return { Items: items.filter((item: any) => item.PK.startsWith('PROVIDER#') && item.SK === 'METADATA') };
    }
    return { Items: [] };
  }
};


// Seed the DB
const seedDir = path.resolve(__dirname, '../../../data/seed');
const { devices, rules, repairData, providers } = loadSeedFiles(seedDir);
[...devices, ...rules, ...repairData, ...providers].forEach((item) => db.putItem(item as DynamoItem));
console.log(`[DevServer] DB Seeded with ${db.count()} items.`);

// Import handlers after mocking
import { handler as listDevices } from '../handlers/listDevices';
import { handler as getDevice } from '../handlers/getDevice';
import { handler as listProviders } from '../handlers/listProviders';
import { handler as startDiagnosis } from '../handlers/startDiagnosis';
import { handler as analyzeDiagnosis } from '../handlers/analyzeDiagnosis';
import { handler as getDiagnosis } from '../handlers/getDiagnosis';
import { handler as saveRepairHistory } from '../handlers/saveRepairHistory';
import { handler as listRepairHistory } from '../handlers/listRepairHistory';
import { handler as getUploadUrl } from '../handlers/getUploadUrl';

const app = express();
app.use(cors());
app.use(express.json());

// Helper to convert Express request to APIGatewayProxyEventV2
const wrapHandler = (handler: any) => async (req: express.Request, res: express.Response) => {
  const event = {
    body: JSON.stringify(req.body),
    headers: req.headers,
    pathParameters: req.params,
    queryStringParameters: req.query,
    requestContext: {},
  };

  try {
    const result = await handler(event, {} as any, () => {});
    const statusCode = result.statusCode || 200;
    const body = result.body ? JSON.parse(result.body) : {};
    res.status(statusCode).json(body);
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Routes
app.get('/devices', wrapHandler(listDevices));
app.get('/devices/:id', wrapHandler(getDevice));
app.get('/providers', wrapHandler(listProviders));
app.post('/diagnosis/start', wrapHandler(startDiagnosis));
app.post('/diagnosis/analyze', wrapHandler(analyzeDiagnosis));
app.get('/diagnosis/:id', wrapHandler(getDiagnosis));
app.post('/repair-history', wrapHandler(saveRepairHistory));
app.get('/repair-history', wrapHandler(listRepairHistory));
app.post('/upload-url', wrapHandler(getUploadUrl));

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`[DevServer] API running locally on http://localhost:${PORT}`);
});
