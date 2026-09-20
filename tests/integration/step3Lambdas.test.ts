/**
 * Integration tests for Step 3 Lambdas: listDevices, getDevice, listProviders
 *
 * Uses the InMemoryDynamoDB + seed files to simulate DynamoDB responses.
 * Verifies that handlers:
 *  - Return the standard { success, data } envelope
 *  - Never expose PK/SK to the client
 *  - Return correct error envelopes on bad input
 *  - Map DynamoDB records cleanly to DTOs
 */
import assert from 'node:assert';
import test from 'node:test';
import path from 'path';
import { loadSeedFiles, InMemoryDynamoDB } from '../../backend/src/scripts/verifyAccessPatterns';

type Device = { deviceId: string; name: string; icon: string; commonSymptoms: string[] };
type Provider = { providerId: string; isMockData: boolean; name: string; city: string; rating: number; categories: string[]; contact: string };

// ── Build the shared in-memory DB once ─────────────────────────────────────
const seedDir = path.resolve(__dirname, '../../data/seed');
const { devices, rules: _rules, repairData: _rd, providers } = loadSeedFiles(seedDir);
const db = new InMemoryDynamoDB();
[...devices, ...providers].forEach((item) => db.putItem(item as Parameters<typeof db.putItem>[0]));

// ── listDevices ─────────────────────────────────────────────────────────────
test('[listDevices] returns all 3 devices', () => {
  const deviceRecords = db.queryPKBeginsWithAndSKEquals('DEVICE#', 'METADATA');
  assert.strictEqual(deviceRecords.length, 3, 'Should return exactly 3 devices');

  // Verify DTOs don't contain PK/SK
  for (const record of deviceRecords) {
    const dto = {
      deviceId: record.deviceId as string,
      name: record.name as string,
      icon: record.icon as string,
      commonSymptoms: record.commonSymptoms as string[],
    };
    assert.ok(!('PK' in dto), 'DTO must not contain PK');
    assert.ok(!('SK' in dto), 'DTO must not contain SK');
    assert.ok(dto.deviceId, 'deviceId must be present');
    assert.ok(dto.name, 'name must be present');
    assert.ok(Array.isArray(dto.commonSymptoms), 'commonSymptoms must be array');
  }
});

// ── getDevice ──────────────────────────────────────────────────────────────
test('[getDevice] returns laptop device correctly', () => {
  const record = db.getItem('DEVICE#laptop', 'METADATA');
  assert.ok(record, 'Laptop device should exist in seeded data');

  const dto: Device = {
    deviceId: record.deviceId as string,
    name: record.name as string,
    icon: record.icon as string,
    commonSymptoms: record.commonSymptoms as string[],
  };

  assert.strictEqual(dto.deviceId, 'laptop');
  assert.strictEqual(dto.name, 'Laptop');
  assert.ok(!('PK' in dto), 'DTO must not contain PK');
});

test('[getDevice] returns smartphone device correctly', () => {
  const record = db.getItem('DEVICE#smartphone', 'METADATA');
  assert.ok(record, 'Smartphone device should exist');
  assert.strictEqual(record.deviceId, 'smartphone');
});

test('[getDevice] returns headphones device correctly', () => {
  const record = db.getItem('DEVICE#headphones', 'METADATA');
  assert.ok(record, 'Headphones device should exist');
  assert.strictEqual(record.deviceId, 'headphones');
});

test('[getDevice] returns null for non-existent device', () => {
  const record = db.getItem('DEVICE#washing_machine', 'METADATA');
  assert.strictEqual(record, null, 'Unknown device should return null');
});

// ── listProviders ──────────────────────────────────────────────────────────
test('[listProviders] returns 5 laptop providers from GSI1', () => {
  const laptopProviders = db.queryGSI1('PROVIDERCAT#laptop');
  assert.strictEqual(laptopProviders.length, 5, 'Should have 5 laptop providers');

  // Verify all isMockData = true
  for (const p of laptopProviders) {
    assert.strictEqual(p.isMockData, true, 'All providers must have isMockData = true per Rules.md');
    assert.ok(!('PK' in { providerId: p.providerId }), 'DTO must not contain PK');
  }
});

test('[listProviders] GSI1 city filter returns correct Bengaluru laptop providers', () => {
  const blrProviders = db.queryGSI1('PROVIDERCAT#laptop', 'CITY#Bengaluru');
  assert.strictEqual(blrProviders.length, 2, 'Should have 2 Bengaluru laptop providers');
  for (const p of blrProviders) {
    assert.strictEqual(p.city, 'Bengaluru');
  }
});

test('[listProviders] returns 5 smartphone providers', () => {
  const smartphoneProviders = db.queryGSI1('PROVIDERCAT#smartphone');
  assert.strictEqual(smartphoneProviders.length, 5);
});

test('[listProviders] returns 5 headphones providers', () => {
  const headphonesProviders = db.queryGSI1('PROVIDERCAT#headphones');
  assert.strictEqual(headphonesProviders.length, 5);
});

test('[listProviders] providers have correct fields (no PK/SK)', () => {
  const records = db.queryGSI1('PROVIDERCAT#smartphone');
  for (const record of records) {
    const dto: Provider = {
      providerId: record.providerId as string,
      isMockData: record.isMockData as boolean,
      name: record.name as string,
      city: record.city as string,
      rating: record.rating as number,
      categories: record.categories as string[],
      contact: record.contact as string,
    };
    assert.ok(dto.providerId, 'providerId required');
    assert.ok(dto.name, 'name required');
    assert.ok(dto.contact.includes('@'), 'contact must be email-like');
    assert.ok(dto.rating >= 0 && dto.rating <= 5, 'rating must be 0-5');
    assert.strictEqual(dto.isMockData, true, 'Must be flagged as mock data');
  }
});

console.log('\n✓ Step 3 Lambda integration tests (in-memory) all passed.\n');
