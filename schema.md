# schema.md — BACK2LIFE

Single DynamoDB table: **`Back2LifeTable`**, billing mode **On-Demand** (no capacity planning needed for a hackathon's unpredictable traffic).

## 1. Key Design

| Entity           | PK                      | SK                       | Notes                                   |
| ---------------- | ----------------------- | ------------------------ | --------------------------------------- |
| Device           | `DEVICE#<deviceId>`     | `METADATA`               | e.g. `DEVICE#laptop`                    |
| DiagnosticRule   | `DEVICE#<deviceId>`     | `RULE#<ruleId>`          | Questions + symptom→issue mapping       |
| RepairData       | `DEVICE#<deviceId>`     | `REPAIRDATA#<issueId>`   | Pricing, complexity, parts availability |
| Provider         | `PROVIDER#<providerId>` | `METADATA`               | Mock repair shop                        |
| DiagnosisSession | `SESSION#<sessionId>`   | `METADATA`               | Ephemeral, TTL-expired after 30 days    |
| RepairHistory    | `USER#<sessionId>`      | `HISTORY#<isoTimestamp>` | One item per saved diagnosis            |

## 2. Global Secondary Indexes

**GSI1 — Providers by category/city**

- GSI1PK = `PROVIDERCAT#<deviceCategory>`
- GSI1SK = `CITY#<city>`
- Used by `listProviders?device=laptop&city=Bengaluru`

**GSI2 — RepairData by issue (cross-device lookup, optional)**

- GSI2PK = `ISSUE#<issueId>`
- GSI2SK = `DEVICE#<deviceId>`
- Used only if the same issue code needs to be looked up without knowing the device (not required for MVP, included for future-proofing).

## 3. Access Patterns

| #   | Access pattern                       | Query                                                                                                                            |
| --- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | List all devices                     | `Query PK begins_with DEVICE# AND SK = METADATA` (or a small static `GET /devices` Lambda-side cache since only 3 devices exist) |
| 2   | Get one device                       | `GetItem PK=DEVICE#<id>, SK=METADATA`                                                                                            |
| 3   | Get diagnostic rules for a device    | `Query PK=DEVICE#<id>, SK begins_with RULE#`                                                                                     |
| 4   | Get repair data for an issue         | `GetItem PK=DEVICE#<id>, SK=REPAIRDATA#<issueId>`                                                                                |
| 5   | Create/read a diagnosis session      | `PutItem` / `GetItem PK=SESSION#<id>, SK=METADATA`                                                                               |
| 6   | List providers for a device category | `Query GSI1PK=PROVIDERCAT#<cat>`                                                                                                 |
| 7   | Save repair history item             | `PutItem PK=USER#<sessionId>, SK=HISTORY#<ts>`                                                                                   |
| 8   | List repair history for a user       | `Query PK=USER#<sessionId>, SK begins_with HISTORY#`                                                                             |

## 4. Example Records

### Device

```json
{
  "PK": "DEVICE#laptop",
  "SK": "METADATA",
  "deviceId": "laptop",
  "name": "Laptop",
  "icon": "laptop",
  "commonSymptoms": [
    "not_charging",
    "wont_turn_on",
    "overheating",
    "screen_issue",
    "keyboard_issue"
  ]
}
```

### DiagnosticRule

```json
{
  "PK": "DEVICE#laptop",
  "SK": "RULE#not_charging",
  "ruleId": "not_charging",
  "symptomLabel": "Laptop not charging",
  "questions": [
    { "id": "charging_led", "text": "Does the charging LED turn on?", "type": "boolean" },
    {
      "id": "works_on_battery",
      "text": "Does the laptop work on battery alone?",
      "type": "boolean"
    },
    {
      "id": "intermittent",
      "text": "Does it charge intermittently (comes and goes)?",
      "type": "boolean"
    },
    {
      "id": "tested_other_charger",
      "text": "Have you tested another compatible charger?",
      "type": "boolean"
    }
  ],
  "dangerousFlags": ["burning_smell", "sparks", "swollen_battery"],
  "possibleIssues": ["charging_port", "charger", "battery", "charging_circuit"]
}
```

### RepairData (DEMO/ESTIMATED DATA — clearly labeled)

```json
{
  "PK": "DEVICE#laptop",
  "SK": "REPAIRDATA#charging_port",
  "issueId": "charging_port",
  "issueLabel": "Charging Port",
  "isDemoData": true,
  "partsAvailability": "GOOD",
  "repairComplexity": "MEDIUM",
  "repairCostMinINR": 400,
  "repairCostMaxINR": 1200,
  "replacementCostMinINR": 35000,
  "replacementCostMaxINR": 60000,
  "expectedRepairTimeDays": 2,
  "expectedRemainingUsabilityYears": 2
}
```

### Provider (MOCK DATA)

```json
{
  "PK": "PROVIDER#p001",
  "SK": "METADATA",
  "GSI1PK": "PROVIDERCAT#laptop",
  "GSI1SK": "CITY#Bengaluru",
  "providerId": "p001",
  "isMockData": true,
  "name": "QuickFix Laptop Care (Demo)",
  "city": "Bengaluru",
  "rating": 4.3,
  "categories": ["laptop"],
  "contact": "demo-only@example.com"
}
```

### DiagnosisSession

```json
{
  "PK": "SESSION#3f2a...",
  "SK": "METADATA",
  "sessionId": "3f2a...",
  "deviceId": "laptop",
  "problemText": "Laptop not charging",
  "answers": {
    "charging_led": false,
    "works_on_battery": true,
    "intermittent": false,
    "tested_other_charger": true
  },
  "status": "COMPLETE",
  "result": { "likelyIssue": "charging_port", "score": 82, "comparison": "repair_recommended" },
  "createdAt": "2026-09-18T10:00:00Z",
  "ttl": 1760000000
}
```

### RepairHistory

```json
{
  "PK": "USER#3f2a...",
  "SK": "HISTORY#2026-09-18T10:02:00Z",
  "sessionId": "3f2a...",
  "deviceId": "laptop",
  "issueId": "charging_port",
  "score": 82,
  "decision": "repair_recommended"
}
```

## 5. Relationships

- A `Device` has many `DiagnosticRules` and many `RepairData` records (one per possible issue).
- A `DiagnosisSession` references exactly one `Device` and, once complete, exactly one matched issue in `RepairData`.
- A `RepairHistory` item is a lightweight snapshot of a completed `DiagnosisSession`, scoped to the anonymous `sessionId` acting as the user identity for MVP.
- `Providers` are independent of sessions — looked up by device category (and optionally city) at display time.
