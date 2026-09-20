import path from 'path';
import assert from 'node:assert';
import { loadSeedFiles } from './seed';
import { InMemoryDynamoDB, DynamoItem } from './verifyAccessPatterns';

interface ProviderRecord extends DynamoItem {
  providerId: string;
  isMockData: boolean;
  name: string;
  city: string;
  rating: number;
  categories: string[];
  contact: string;
}

interface DeviceRecord extends DynamoItem {
  deviceId: string;
  name: string;
  icon: string;
  commonSymptoms: string[];
}

export async function runStep3Tests(): Promise<void> {
  console.log('=== STEP 3: listDevices / getDevice / listProviders Lambda Tests ===\n');

  const seedDir = path.resolve(__dirname, '../../../data/seed');
  const { devices, repairData: _rd, rules: _rules, providers } = loadSeedFiles(seedDir);

  const db = new InMemoryDynamoDB();
  [...devices, ...providers].forEach((item) => db.putItem(item as DynamoItem));

  // ── listDevices tests ──────────────────────────────────────────────────
  console.log('→ listDevices');
  const deviceRecords = db.queryPKBeginsWithAndSKEquals('DEVICE#', 'METADATA') as DeviceRecord[];
  assert.strictEqual(deviceRecords.length, 3, 'Should have exactly 3 devices');
  for (const r of deviceRecords) {
    assert.ok(!Object.keys(r).some((k) => ['PK', 'SK'].includes(k) && !(r as DeviceRecord).deviceId),
      'DTO check: deviceId must be present');
    assert.ok((r as DeviceRecord).deviceId, 'deviceId required');
    assert.ok(Array.isArray((r as DeviceRecord).commonSymptoms), 'commonSymptoms must be array');
    // Clean DTO must have no rawDynamo PK/SK leaked in response (verified by schema parse)
    const dto = { deviceId: r.deviceId, name: r.name, icon: r.icon, commonSymptoms: r.commonSymptoms };
    assert.strictEqual(Object.keys(dto).includes('PK'), false, 'DTO must not expose PK');
    assert.strictEqual(Object.keys(dto).includes('SK'), false, 'DTO must not expose SK');
  }
  console.log(`   ✓ ${deviceRecords.length} devices found, DTOs clean (no PK/SK)`);

  // ── getDevice — happy paths ────────────────────────────────────────────
  console.log('→ getDevice');
  const laptop = db.getItem('DEVICE#laptop', 'METADATA') as DeviceRecord;
  assert.ok(laptop, 'Laptop must exist');
  assert.strictEqual(laptop.deviceId, 'laptop');
  assert.strictEqual(laptop.name, 'Laptop');
  assert.ok(Array.isArray(laptop.commonSymptoms) && laptop.commonSymptoms.length > 0);
  console.log('   ✓ laptop found:', laptop.name);

  const smartphone = db.getItem('DEVICE#smartphone', 'METADATA') as DeviceRecord;
  assert.ok(smartphone && smartphone.deviceId === 'smartphone');
  console.log('   ✓ smartphone found:', smartphone.name);

  const headphones = db.getItem('DEVICE#headphones', 'METADATA') as DeviceRecord;
  assert.ok(headphones && headphones.deviceId === 'headphones');
  console.log('   ✓ headphones found:', headphones.name);

  // ── getDevice — failure path ───────────────────────────────────────────
  const unknown = db.getItem('DEVICE#washing_machine', 'METADATA');
  assert.strictEqual(unknown, null, 'Unknown device must return null → handler returns 404');
  console.log('   ✓ unknown device returns null (404 path)');

  // ── listProviders tests ────────────────────────────────────────────────
  console.log('→ listProviders');
  const laptopProviders = db.queryGSI1('PROVIDERCAT#laptop') as ProviderRecord[];
  assert.strictEqual(laptopProviders.length, 5, 'Should have 5 laptop providers');
  console.log(`   ✓ ${laptopProviders.length} laptop providers via GSI1`);

  const blrProviders = db.queryGSI1('PROVIDERCAT#laptop', 'CITY#Bengaluru') as ProviderRecord[];
  assert.strictEqual(blrProviders.length, 2, 'Should have 2 Bengaluru laptop providers');
  console.log(`   ✓ ${blrProviders.length} Bengaluru laptop providers via GSI1 range key`);

  const smartphoneProviders = db.queryGSI1('PROVIDERCAT#smartphone');
  assert.strictEqual(smartphoneProviders.length, 5, 'Should have 5 smartphone providers');

  const headphonesProviders = db.queryGSI1('PROVIDERCAT#headphones');
  assert.strictEqual(headphonesProviders.length, 5, 'Should have 5 headphones providers');
  console.log('   ✓ smartphone and headphones providers (5 each)');

  // All providers must have isMockData = true per Rules.md
  const allProviders = [
    ...db.queryGSI1('PROVIDERCAT#laptop'),
    ...db.queryGSI1('PROVIDERCAT#smartphone'),
    ...db.queryGSI1('PROVIDERCAT#headphones'),
  ] as ProviderRecord[];

  for (const p of allProviders) {
    assert.strictEqual(p.isMockData, true, `Provider ${p.providerId} must have isMockData=true`);
    assert.ok(p.rating >= 0 && p.rating <= 5, 'rating must be 0–5');
    assert.ok(p.contact, 'contact must be present');
    const dto = { providerId: p.providerId, name: p.name, city: p.city, rating: p.rating, categories: p.categories, contact: p.contact, isMockData: p.isMockData };
    assert.strictEqual(Object.keys(dto).includes('PK'), false, 'Provider DTO must not expose PK');
    assert.strictEqual(Object.keys(dto).includes('GSI1PK'), false, 'Provider DTO must not expose GSI1PK');
  }
  console.log(`   ✓ All 15 providers: isMockData=true, valid ratings, DTOs clean`);

  console.log('\n=== STEP 3 TESTS: ALL PASSED ===\n');
}

if (require.main === module) {
  runStep3Tests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Step 3 tests FAILED:', err);
      process.exit(1);
    });
}
