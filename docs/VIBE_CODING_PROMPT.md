# FINAL MASTER VIBE-CODING PROMPT — BACK2LIFE

Paste this entire document into your vibe-coding application as the build instruction.

---

## PROJECT CONTEXT

You are building **BACK2LIFE** ("Repair Before Replacement"), an AI-assisted repair-vs-replace decision-support web app for a hackathon with AWS serverless infrastructure. A user describes a broken device (laptop, smartphone, or headphones/earphones), answers a few yes/no diagnostic questions, and receives: an AI-reasoned likely issue, a deterministic 0–100 Repairability Score, and a repair-vs-replace cost comparison — all built on verified/clearly-labeled demo data, never on AI-invented numbers.

## PRODUCT REQUIREMENTS (P0 — build these first, completely, before anything else)

1. Landing page with 3 device quick-starts (Laptop, Smartphone, Headphones/Earphones).
2. Problem description (free text, max 300 chars) + up to 5 structured yes/no diagnostic questions per symptom.
3. Dangerous-symptom detection (smoke, sparks, burning smell, swollen battery, shock, exposed wiring) that runs BEFORE any AI call and, if triggered, shows a safety warning screen instead of a normal diagnosis — no repair steps, ever, for these cases.
4. AI symptom reasoning via Amazon Bedrock producing a likely issue + plain-language reason, strictly validated against a JSON schema before use.
5. Deterministic Repairability Score (0–100) computed in backend code — never by the AI. Use this exact formula:
   - 30% parts availability (GOOD=100/MEDIUM=60/POOR=20)
   - 30% cost ratio score = `clamp(1 - avgRepairCost/avgReplacementCost, 0, 1) × 100`
   - 20% repair complexity (LOW=100/MEDIUM=60/HIGH=20)
   - 10% device age factor (0–1yr=100, 1–3yr=70, 3–5yr=40, 5yr+=15, unknown=70)
   - 10% expected remaining usability = `min(years/3, 1) × 100`
   - `score = round(weighted sum)`
   - Bands: 80–100 Excellent, 60–79 Good, 40–59 Fair, 20–39 Poor, 0–19 Not recommended.
6. Deterministic Repair-vs-Replace recommendation:
   - score≥60 AND repairCost<0.5×replacementCost → "repair_recommended"
   - score≤30 OR repairCost≥0.8×replacementCost → "replacement_recommended"
   - else → "neutral"
7. Result persistence (DynamoDB) keyed by a client-generated anonymous `sessionId` (UUID, stored in localStorage) — no login required for P0.

## P1 (build after P0 is fully working end-to-end)

- Mock repair provider discovery, clearly labeled "Demo Providers."
- Repair history screen (list + reopen past saved diagnoses).

## P2 (only if time remains — do not let these delay P0/P1)

- Photo upload via S3 presigned URL.
- Amazon Cognito optional login for cross-device history.
- Additional device categories.

## TECH STACK (use exactly this — do not substitute without asking)

- Frontend: React 18 + TypeScript + Vite + Tailwind CSS, React Router, React Context for session state.
- Backend: Node.js 20 + TypeScript, one AWS Lambda per API route, shared `lib/` Lambda Layer.
- API: Amazon API Gateway (HTTP API, not REST API).
- Database: Amazon DynamoDB, single table `Back2LifeTable`, on-demand billing.
- AI: Amazon Bedrock, Anthropic Claude Haiku-class model, invoked ONLY from the `analyzeDiagnosis` Lambda.
- Storage: Amazon S3 (frontend static hosting + optional uploads bucket) + CloudFront.
- IaC: AWS CDK v2, TypeScript.
- Monitoring: CloudWatch Logs, an error-rate alarm, and a billing alarm.
- Validation: Zod on both frontend forms and every backend Lambda input/output, including validating raw Bedrock output before use.

## ARCHITECTURE (must match exactly)

```
Browser → CloudFront → S3 (frontend static site)
Browser → API Gateway (HTTP API) → Lambda (one per route)
    Lambdas → DynamoDB (Back2LifeTable)
    analyzeDiagnosis Lambda ONLY → Bedrock Runtime
    getUploadUrl Lambda → S3 uploads bucket (presigned URL only, P2)
    All Lambdas → CloudWatch Logs
```

Full Mermaid diagrams are in `architecture.md` of the accompanying documentation set — follow them exactly, including the sequence diagram for the diagnostic flow and the AI-boundary flow diagram.

## FOLDER STRUCTURE (create exactly this)

```
/frontend
  /src
    /screens        (Landing, DeviceSelect, ProblemDescribe, Diagnostic, Analysis, Result, Score, Comparison, Providers, History, Safety)
    /components
    /context        (DiagnosisSessionContext)
    /api            (typed client)
/backend
  /src
    /handlers       (startDiagnosis.ts, analyzeDiagnosis.ts, getDiagnosis.ts, listDevices.ts, getDevice.ts, listProviders.ts, createRepairHistory.ts, listRepairHistory.ts, getUploadUrl.ts)
    /lib            (dynamoClient.ts, repairabilityEngine.ts, repairVsReplaceEngine.ts, schemas.ts, responses.ts, bedrockClient.ts, dangerousSymptomCheck.ts)
/infra
  /cdk              (CDK app + stacks: data-stack, api-stack, storage-stack)
/data
  /seed             (devices.json, diagnosticRules.json, repairData.json, providers.json)
/docs               (this documentation set)
/tests
  /unit /integration /e2e
```

## DATABASE SCHEMA

Single table `Back2LifeTable`, on-demand. Keys and example items:

- Device: `PK=DEVICE#<id>, SK=METADATA`
- DiagnosticRule: `PK=DEVICE#<id>, SK=RULE#<ruleId>` — includes `questions[]`, `dangerousFlags[]`, `possibleIssues[]`
- RepairData: `PK=DEVICE#<id>, SK=REPAIRDATA#<issueId>` — includes cost ranges, `partsAvailability`, `repairComplexity`, `expectedRepairTimeDays`, `expectedRemainingUsabilityYears`, `isDemoData: true`
- Provider: `PK=PROVIDER#<id>, SK=METADATA`, `GSI1PK=PROVIDERCAT#<category>, GSI1SK=CITY#<city>`, `isMockData: true`
- DiagnosisSession: `PK=SESSION#<sessionId>, SK=METADATA`, TTL 30 days
- RepairHistory: `PK=USER#<sessionId>, SK=HISTORY#<isoTimestamp>`
  Full example JSON records are in `schema.md` — reproduce them exactly for seed data.

## API CONTRACTS

All responses: `{ "success": true, "data": {...} }` or `{ "success": false, "error": { "code": "...", "message": "..." } }`.

- `POST /diagnosis/start` — body `{ deviceId, problemText }` → `{ sessionId, questions[] }`
- `POST /diagnosis/analyze` — body `{ sessionId, answers }` → `{ safetyWarning }` OR `{ likelyIssue, otherPossibleCauses[], score, scoreBreakdown, comparison, confidence }`
- `GET /diagnosis/{id}` → persisted session/result
- `GET /devices`, `GET /devices/{id}`
- `GET /providers?device=<id>&city=<city>`
- `POST /repair-history`, `GET /repair-history?sessionId=<id>`
- `POST /upload-url` (P2) → `{ uploadUrl, objectKey }`
  All inputs validated with Zod; unknown/invalid fields rejected with a 400 and the standard error envelope.

## AI CONTRACT (Bedrock)

Input sent to Bedrock (and NOTHING else — no history, no PII, no pricing data):

```json
{
  "device": "laptop",
  "problemText": "Laptop not charging",
  "answers": { "charging_led": false, "works_on_battery": true }
}
```

Required output JSON schema (validate with Zod, reject anything else):

```json
{
  "likelyIssues": [
    { "issue": "charging_port", "likelihood": "high", "reason": "string, plain language" }
  ],
  "followUpQuestions": [],
  "safetyWarning": null
}
```

On invalid/malformed output: retry once with a stricter system prompt; if still invalid, fall back to a rule-based answer derived from `DiagnosticRules.possibleIssues` (first entry) instead of surfacing an error to the user. Never show raw/unvalidated Bedrock text to the user. Never let Bedrock compute price, score, or recommend repair vs. replace — that is always done in `lib/repairabilityEngine.ts` and `lib/repairVsReplaceEngine.ts` using `RepairData`.

## REPAIRABILITY ENGINE & REPAIR-VS-REPLACE ENGINE

Implement exactly as specified in "PRODUCT REQUIREMENTS" items 5–6 above, as pure, unit-tested TypeScript functions in `lib/`. Write unit tests covering: a clear repair-favored case, a clear replace-favored case, a neutral/tie case, and a missing-data case (must return "insufficient data," never a fabricated score).

## UI REQUIREMENTS

Follow `Design.md` exactly: forest green primary (#1F6F4A), amber for caution (#D97706), red reserved exclusively for the safety screen (#DC2626). Every price is labeled "Estimated." Every provider list is labeled "Demo Providers." Every result card is tagged by source: "AI-assessed," "Calculated," or "Demo data." Yes/No questions are large two-button toggles, not radio buttons. Progress bar across the diagnostic flow. Score shown as a circular gauge with band label, never color-only (always paired with the number and label for accessibility). Mobile-first, single-column diagnostic flow.

## SECURITY REQUIREMENTS

- HTTPS only end to end.
- Both S3 buckets: Block Public Access ON; frontend served only via CloudFront Origin Access Control, never a public bucket policy.
- Every Lambda gets its own least-privilege IAM role — no wildcard permissions, no `AdministratorAccess`.
- No AWS credentials or secrets in frontend code; all config via environment variables.
- CORS locked to the deployed CloudFront domain (plus localhost in dev).
- Prompt-injection defense: user free text is placed in a clearly delimited "user data" field in the Bedrock prompt with an explicit system instruction that it is data, not instructions.
- Zod-validate every Lambda input before any business logic runs.

## ERROR HANDLING

Every Lambda wraps its handler in try/catch, logs full details to CloudWatch, and returns only the standard coded error envelope to the client — never a stack trace, ARN, or internal DynamoDB detail. Implement specific handling for: invalid input, missing fields, unsupported device, missing diagnostic rules, Bedrock failure/timeout, malformed Bedrock response (→ fallback, not error), DynamoDB failure, S3 failure, provider not found, no repair data (→ "insufficient data" response, not a fabricated score), API timeout.

## VALIDATION

Zod schemas for: every API request body, every API response DTO, the Bedrock output schema, and all frontend form inputs (problem text length, boolean answers).

## AWS REQUIREMENTS

Use exactly: S3, CloudFront, API Gateway (HTTP API), Lambda, DynamoDB, Bedrock, CloudWatch, IAM. Do not add EC2, RDS, ECS/EKS, NAT Gateway, ElastiCache, OpenSearch, or complex VPC networking — none are needed and they would burn hackathon credits unnecessarily. Cognito, Amplify Hosting, and Bedrock Guardrails are optional/P2 only.

## ENVIRONMENT VARIABLES

Backend: `TABLE_NAME`, `BEDROCK_MODEL_ID`, `BEDROCK_REGION`, `UPLOADS_BUCKET`, `LOG_LEVEL`.
Frontend: `VITE_API_BASE_URL`.

## TESTING

Unit tests for both deterministic engines (highest priority — write these first). Integration tests for every Lambda handler against dynamodb-local and a mocked Bedrock client, covering happy path and every error case above. One end-to-end test covering the full P0 demo flow, and one specifically covering the dangerous-symptom safety flow (must confirm Bedrock is never called).

## SEED DATA

Create demo/estimated data for exactly 3 devices (laptop, smartphone, headphones/earphones), 3–5 common symptoms per device, their diagnostic questions, 3–4 possible issues per symptom with full `RepairData` records (all `isDemoData: true`), and 10–20 mock providers (all `isMockData: true`) spread across the 3 device categories. Never present this seed data as verified real-world data anywhere in the UI copy.

## DEPLOYMENT

CDK stacks: data (DynamoDB), storage (S3 buckets), api (API Gateway + Lambdas). Deploy order: data → storage → api. Frontend deploys separately via build + `s3 sync` + CloudFront invalidation. Set a CloudWatch billing alarm immediately after the first deploy, before any Bedrock testing begins.

## ACCEPTANCE CRITERIA (P0 complete when ALL of these are true)

1. A user can go from the landing page to a full repair-vs-replace result for "Laptop not charging" without any error.
2. The Repairability Score shown matches the documented formula exactly (verify against the worked example: parts=GOOD, complexity=MEDIUM, cost ratio ≈98, age unknown, usability=2yrs → score ≈85, "Excellent").
3. Entering a dangerous symptom (e.g., "burning smell") immediately shows the safety screen and Bedrock is never invoked for that session (verify via logs/mocks).
4. No price, provider, or score anywhere in the app was generated directly by the AI — all are traceable to deterministic backend code or clearly-labeled demo data.
5. No AWS credentials or secrets appear in any frontend bundle.
6. All S3 buckets have Block Public Access enabled; the frontend bucket has no public bucket policy.
7. Every Lambda has its own IAM role with no wildcard permissions.

## VIBE-CODING DEVELOPMENT BEHAVIOR — FOLLOW THIS EXACTLY

**Do not build the entire application in one giant step.** Build incrementally, following the phase order in `Phases.md` / `ImplementationPlan.md`:

```
Phase 0 (docs/scaffold) → verify build succeeds
→ Phase 1 (frontend shell) → verify all screens navigate
→ Phase 2 (API/Lambda skeletons) → verify stub responses
→ Phase 3 (DynamoDB + seed + read Lambdas) → verify real data returns
→ Phase 4 (Bedrock + safety) → verify AI output validation and safety short-circuit
→ Phase 5 (scoring engines) → verify unit tests pass against documented examples
→ Phase 6 (providers) → verify provider list
→ Phase 7 (security + monitoring) → verify IAM/S3/CORS checklist and alarms
→ Phase 8 (testing) → verify full suite passes
→ Phase 9 (deploy) → verify public URL works end-to-end
→ Phase 10 (demo prep) → verify two clean demo run-throughs
```

After each phase: run the relevant tests, check for errors, inspect the generated files, verify imports resolve, verify the API contract matches this document, verify AWS configuration (IAM, env vars), verify the UI renders correctly — and fix any issues found before moving to the next phase. Do not create fake/stubbed implementations where a real one is required by an acceptance criterion above. Do not leave `TODO` placeholders anywhere in P0 functionality.
