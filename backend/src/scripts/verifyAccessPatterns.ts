import path from 'path';
import { loadSeedFiles } from './seed';

// Interface representing the DynamoDB Single-Table record shape
export interface DynamoItem {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
  GSI2PK?: string;
  GSI2SK?: string;
  [key: string]: unknown;
}

// In-memory DynamoDB query simulator to verify schema.md §3 access patterns
export class InMemoryDynamoDB {
  private items = new Map<string, DynamoItem>();

  public putItem(item: DynamoItem): void {
    const key = `${item.PK}##${item.SK}`;
    this.items.set(key, { ...item });
  }

  public getItem(PK: string, SK: string): DynamoItem | null {
    const key = `${PK}##${SK}`;
    return this.items.get(key) || null;
  }

  public queryPKAndSKBeginsWith(PK: string, skPrefix: string): DynamoItem[] {
    const results: DynamoItem[] = [];
    for (const item of this.items.values()) {
      if (item.PK === PK && item.SK.startsWith(skPrefix)) {
        results.push(item);
      }
    }
    return results;
  }

  public queryPKBeginsWithAndSKEquals(pkPrefix: string, SK: string): DynamoItem[] {
    const results: DynamoItem[] = [];
    for (const item of this.items.values()) {
      if (item.PK.startsWith(pkPrefix) && item.SK === SK) {
        results.push(item);
      }
    }
    return results;
  }

  public queryGSI1(GSI1PK: string, gsi1skPrefix?: string): DynamoItem[] {
    const results: DynamoItem[] = [];
    for (const item of this.items.values()) {
      if (item.GSI1PK === GSI1PK) {
        if (!gsi1skPrefix || (item.GSI1SK && item.GSI1SK.startsWith(gsi1skPrefix))) {
          results.push(item);
        }
      }
    }
    return results;
  }

  public count(): number {
    return this.items.size;
  }

  public scan(): DynamoItem[] {
    return Array.from(this.items.values());
  }
}

export async function runVerification(): Promise<boolean> {
  console.log('=== VERIFYING STEP 2: DynamoDB Table & Seed Data Access Patterns ===\n');

  // 1. Verify seed files exist and load correctly
  const seedDir = path.resolve(__dirname, '../../../data/seed');
  const { devices, rules, repairData, providers } = loadSeedFiles(seedDir);

  console.log('Seed files inspection:');
  console.log(` - Devices loaded: ${devices.length} (Expected: 3)`);
  console.log(` - Diagnostic Rules loaded: ${rules.length} (Expected: 12)`);
  console.log(` - Repair Data loaded: ${repairData.length} (Expected: 37)`);
  console.log(` - Providers loaded: ${providers.length} (Expected: 15)`);

  if (
    devices.length !== 3 ||
    rules.length !== 12 ||
    repairData.length !== 37 ||
    providers.length !== 15
  ) {
    throw new Error('Seed counts do not match expected totals.');
  }

  const db = new InMemoryDynamoDB();
  const allItems = [...devices, ...rules, ...repairData, ...providers] as DynamoItem[];
  allItems.forEach((item) => db.putItem(item));

  console.log(`\nPopulated table with ${db.count()} items.\n`);
  console.log('Testing all 8 access patterns from schema.md §3:');

  // Access Pattern 1: List all devices
  const allDevices = db.queryPKBeginsWithAndSKEquals('DEVICE#', 'METADATA');
  console.log(
    `[AP 1] List all devices: found ${allDevices.length} items (laptop, smartphone, headphones)`,
  );
  if (allDevices.length !== 3) throw new Error('AP 1 failed: Expected 3 devices');

  // Access Pattern 2: Get one device
  const laptop = db.getItem('DEVICE#laptop', 'METADATA');
  console.log(`[AP 2] Get device 'laptop': found '${laptop?.name}'`);
  if (!laptop || laptop.deviceId !== 'laptop') throw new Error('AP 2 failed: Device not found');

  // Access Pattern 3: Get diagnostic rules for a device
  const laptopRules = db.queryPKAndSKBeginsWith('DEVICE#laptop', 'RULE#');
  console.log(`[AP 3] Get diagnostic rules for 'laptop': found ${laptopRules.length} rules`);
  if (laptopRules.length !== 4) throw new Error('AP 3 failed: Expected 4 laptop rules');

  // Access Pattern 4: Get repair data for an issue
  const chargingPort = db.getItem('DEVICE#laptop', 'REPAIRDATA#charging_port');
  console.log(`[AP 4] Get repair data for 'charging_port': found '${chargingPort?.issueLabel}'`);
  if (!chargingPort || chargingPort.partsAvailability !== 'GOOD')
    throw new Error('AP 4 failed: RepairData mismatch');

  // Access Pattern 5: Create / read diagnosis session
  const sessionId = 'test-session-12345';
  db.putItem({
    PK: `SESSION#${sessionId}`,
    SK: 'METADATA',
    sessionId,
    deviceId: 'laptop',
    problemText: 'Laptop not charging',
    status: 'IN_PROGRESS',
    ttl: Math.floor(Date.now() / 1000) + 30 * 86400,
  });
  const session = db.getItem(`SESSION#${sessionId}`, 'METADATA');
  console.log(
    `[AP 5] Create/Read diagnosis session: found '${session?.sessionId}', status=${session?.status}`,
  );
  if (!session || session.status !== 'IN_PROGRESS')
    throw new Error('AP 5 failed: Session read error');

  // Access Pattern 6: List providers for a device category (GSI1)
  const laptopProviders = db.queryGSI1('PROVIDERCAT#laptop');
  const blrLaptopProviders = db.queryGSI1('PROVIDERCAT#laptop', 'CITY#Bengaluru');
  console.log(
    `[AP 6] List providers for 'laptop' (GSI1): found ${laptopProviders.length} total, ${blrLaptopProviders.length} in Bengaluru`,
  );
  if (laptopProviders.length !== 5 || blrLaptopProviders.length !== 2) {
    throw new Error('AP 6 failed: GSI1 query mismatch');
  }

  // Access Pattern 7 & 8: Save and List repair history
  const userId = 'user-anon-abcde';
  const timestamp = new Date().toISOString();
  db.putItem({
    PK: `USER#${userId}`,
    SK: `HISTORY#${timestamp}`,
    sessionId: 'session-saved-999',
    deviceId: 'laptop',
    issueId: 'charging_port',
    score: 85,
    decision: 'repair_recommended',
  });
  const userHistory = db.queryPKAndSKBeginsWith(`USER#${userId}`, 'HISTORY#');
  console.log(
    `[AP 7 & 8] Save & list repair history: found ${userHistory.length} history item(s) for user`,
  );
  if (userHistory.length !== 1 || userHistory[0].score !== 85) {
    throw new Error('AP 7/8 failed: History query error');
  }

  console.log('\n=== ALL 8 ACCESS PATTERNS VERIFIED SUCCESSFULLY ===');
  return true;
}

if (require.main === module) {
  runVerification()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Verification failed:', err);
      process.exit(1);
    });
}
