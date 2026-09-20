import fs from 'fs';
import path from 'path';
import {
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';
import { rawClient, docClient, TABLE_NAME } from '../lib/dynamoClient';
import { PutCommand } from '@aws-sdk/lib-dynamodb';

export interface SeedDataResult {
  devicesCount: number;
  rulesCount: number;
  repairDataCount: number;
  providersCount: number;
  totalCount: number;
}

export async function ensureTableExists(tableName: string = TABLE_NAME): Promise<void> {
  try {
    await rawClient.send(new DescribeTableCommand({ TableName: tableName }));
    console.log(`Table "${tableName}" exists.`);
  } catch (error) {
    if (
      error instanceof ResourceNotFoundException ||
      (error as { name?: string }).name === 'ResourceNotFoundException'
    ) {
      console.log(`Table "${tableName}" does not exist. Creating table...`);
      await rawClient.send(
        new CreateTableCommand({
          TableName: tableName,
          BillingMode: 'PAY_PER_REQUEST',
          AttributeDefinitions: [
            { AttributeName: 'PK', AttributeType: 'S' },
            { AttributeName: 'SK', AttributeType: 'S' },
            { AttributeName: 'GSI1PK', AttributeType: 'S' },
            { AttributeName: 'GSI1SK', AttributeType: 'S' },
            { AttributeName: 'GSI2PK', AttributeType: 'S' },
            { AttributeName: 'GSI2SK', AttributeType: 'S' },
          ],
          KeySchema: [
            { AttributeName: 'PK', KeyType: 'HASH' },
            { AttributeName: 'SK', KeyType: 'RANGE' },
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: 'GSI1',
              KeySchema: [
                { AttributeName: 'GSI1PK', KeyType: 'HASH' },
                { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
              ],
              Projection: { ProjectionType: 'ALL' },
            },
            {
              IndexName: 'GSI2',
              KeySchema: [
                { AttributeName: 'GSI2PK', KeyType: 'HASH' },
                { AttributeName: 'GSI2SK', KeyType: 'RANGE' },
              ],
              Projection: { ProjectionType: 'ALL' },
            },
          ],
        }),
      );
      console.log(`Table "${tableName}" created successfully.`);
    } else {
      throw error;
    }
  }
}

export function loadSeedFiles(seedDir?: string): {
  devices: Record<string, unknown>[];
  rules: Record<string, unknown>[];
  repairData: Record<string, unknown>[];
  providers: Record<string, unknown>[];
} {
  const baseDir = seedDir || path.resolve(__dirname, '../../../data/seed');

  const devicesPath = path.join(baseDir, 'devices.json');
  const rulesPath = path.join(baseDir, 'diagnosticRules.json');
  const repairDataPath = path.join(baseDir, 'repairData.json');
  const providersPath = path.join(baseDir, 'providers.json');

  const devices = JSON.parse(fs.readFileSync(devicesPath, 'utf-8')) as Record<string, unknown>[];
  const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf-8')) as Record<string, unknown>[];
  const repairData = JSON.parse(fs.readFileSync(repairDataPath, 'utf-8')) as Record<
    string,
    unknown
  >[];
  const providers = JSON.parse(fs.readFileSync(providersPath, 'utf-8')) as Record<
    string,
    unknown
  >[];

  return { devices, rules, repairData, providers };
}

export async function seedDatabase(
  tableName: string = TABLE_NAME,
  seedDir?: string,
): Promise<SeedDataResult> {
  const { devices, rules, repairData, providers } = loadSeedFiles(seedDir);

  const allItems = [...devices, ...rules, ...repairData, ...providers];

  console.log(`Starting seed of ${allItems.length} items into "${tableName}"...`);

  // Insert items using PutCommand to ensure robust insertion
  for (const item of allItems) {
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: item,
      }),
    );
  }

  const result: SeedDataResult = {
    devicesCount: devices.length,
    rulesCount: rules.length,
    repairDataCount: repairData.length,
    providersCount: providers.length,
    totalCount: allItems.length,
  };

  console.log('Seeding completed successfully:');
  console.log(` - Devices: ${result.devicesCount}`);
  console.log(` - Diagnostic Rules: ${result.rulesCount}`);
  console.log(` - Repair Data: ${result.repairDataCount}`);
  console.log(` - Mock Providers: ${result.providersCount}`);
  console.log(` - Total Items: ${result.totalCount}`);

  return result;
}

if (require.main === module) {
  (async () => {
    try {
      await ensureTableExists();
      await seedDatabase();
      process.exit(0);
    } catch (error) {
      console.error('Seeding failed:', error);
      process.exit(1);
    }
  })();
}
