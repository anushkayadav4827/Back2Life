# TechSpec.md — BACK2LIFE

## 1. Technology Stack

- **Frontend:** React 18 + TypeScript + Vite, Tailwind CSS
- **Backend:** Node.js 20 + TypeScript, AWS Lambda (individual functions per route, not a monolith)
- **API:** Amazon API Gateway — **HTTP API** (not REST API) for lower cost and simpler config
- **Database:** Amazon DynamoDB (single-table design)
- **AI:** Amazon Bedrock (Anthropic Claude Haiku-class model — cheapest capable model) for symptom reasoning only
- **Storage:** Amazon S3 (optional photo uploads, static frontend hosting bucket)
- **CDN/Hosting:** Amazon S3 + CloudFront (static site) — Amplify Hosting is an acceptable P1 alternative if the team wants CI/CD from Git
- **Auth (P2 only):** Amazon Cognito (anonymous/guest sessions are used for MVP instead)
- **Monitoring:** Amazon CloudWatch (Logs, Alarms, Dashboard)
- **IAM:** least-privilege roles, one per Lambda function

## 2. Frontend Architecture

- Vite SPA, React Router for screen navigation (Landing → Device → Problem → Questions → Loading → Result → Score → Comparison → Providers → History).
- Global app state via React Context (`DiagnosisSessionContext`) — holds `sessionId`, current answers, and result payloads. No Redux needed for MVP scope.
- API calls centralized in `src/api/client.ts` (typed fetch wrapper against API Gateway base URL from env var).
- A `sessionId` (UUID v4) is generated client-side on first visit and stored in `localStorage`; it is the anonymous identity used for history/persistence (no login required for MVP).

## 3. Backend Architecture

One Lambda function per API route (not a single fat Lambda) so IAM permissions and cost/monitoring stay scoped and simple to reason about:

- `startDiagnosis`
- `analyzeDiagnosis` (calls Bedrock)
- `getDiagnosis`
- `listDevices`
- `getDevice`
- `listProviders`
- `createRepairHistory`
- `listRepairHistory`
- `getUploadUrl` (presigned S3 PUT URL, P2)

All Lambdas share a common `lib/` layer (Lambda Layer) containing: DynamoDB client, response helpers, Zod validation schemas, the Repairability Engine, and the Repair-vs-Replace Engine. Business logic (scoring, comparison) lives in this shared layer — **not** inside Bedrock prompts — so it is deterministic, testable, and reusable.

## 4. AWS Services (summary — see architecture.md for full rationale)

| Service                | Role                                                                             |
| ---------------------- | -------------------------------------------------------------------------------- |
| S3 + CloudFront        | Static frontend hosting; optional photo storage                                  |
| API Gateway (HTTP API) | Public HTTPS entry point, routes to Lambda                                       |
| Lambda                 | All business logic, stateless, pay-per-invocation                                |
| DynamoDB               | Single-table store for devices, rules, repair data, providers, sessions, history |
| Bedrock                | Symptom reasoning only — returns structured JSON, never the final score          |
| CloudWatch             | Logs, error alarms, billing/usage alarms                                         |
| IAM                    | Least-privilege execution roles per Lambda                                       |
| Cognito (P2)           | Optional persistent user identity                                                |

## 5. API Architecture

REST-style JSON over HTTPS via API Gateway HTTP API. See `schema.md` for full endpoint contracts. All responses use the envelope:

```json
{ "success": true, "data": {} }
```

or

```json
{ "success": false, "error": { "code": "STRING_CODE", "message": "human readable" } }
```

## 6. Database

DynamoDB single-table design (`Back2LifeTable`). Rationale: MVP access patterns are simple and known in advance (get device, get rules for device, get repair data for issue, get providers, get/save session, get history for user) — a single table with composite PK/SK avoids join complexity and keeps cost near-zero at hackathon scale. Full schema in `schema.md`.

## 7. Bedrock Integration

- One Bedrock call per diagnosis (`analyzeDiagnosis`), invoked only after all diagnostic questions are answered.
- Input: device category, free-text problem, and structured yes/no answers only — **no full conversation history, no PII**.
- Output: strict JSON schema (`likelyIssues[]`, `followUpQuestions[]`, `safetyWarning`) — validated server-side with Zod before use.
- If validation fails (malformed JSON, unknown issue code, missing field): one retry with a stricter system prompt; if it fails again, return a safe fallback ("Preliminary assessment unavailable — showing general guidance for this symptom") built from `DiagnosticRules` data instead of AI output.
- The Repairability Score and cost comparison are **never** computed by Bedrock — always by the shared `lib/` scoring engine, using `RepairData` table values.

## 8. AI Input/Output Contract

See `memory.md` for the full "what goes to Bedrock / what never does" policy, and the Bedrock section of `architecture.md` for the JSON schema.

## 9. Scoring Engine

Deterministic, pure-function TypeScript module (`lib/repairabilityEngine.ts`). See `PRD.md` §10-equivalent detail in `schema.md`/`architecture.md` and the full formula in `Design.md`/`ImplementationPlan.md`. Inputs come only from `RepairData` records (parts availability, repair complexity, repair cost, replacement cost, device age band, expected remaining usability) — never from Bedrock.

## 10. Authentication / Authorization

- **MVP (P0):** No login. Client-generated `sessionId` (UUID) is the identity used to scope `DiagnosisSessions` and `RepairHistory`. No sensitive PII is collected, so this is an acceptable, low-friction MVP approach.
- **P2:** Amazon Cognito User Pools for optional sign-in, enabling cross-device history. API Gateway would then use a Cognito JWT authorizer on the history endpoints only; anonymous endpoints (devices, providers, diagnosis) stay public.

## 11. Storage

- S3 bucket `back2life-frontend-<env>` — static site assets, served via CloudFront, **Block Public Access enabled**, CloudFront Origin Access Control used instead of a public bucket policy.
- S3 bucket `back2life-uploads-<env>` (P2) — user-uploaded device photos, written only via short-lived presigned PUT URLs issued by `getUploadUrl`, private, lifecycle rule to expire objects after 30 days.

## 12. Monitoring

- CloudWatch Logs for every Lambda (default).
- CloudWatch Alarm on Bedrock Lambda error rate and on estimated daily cost (Billing Alarm via CloudWatch + SNS, since AWS credits are limited).
- A simple CloudWatch Dashboard showing: API Gateway request count/latency, Lambda error count, DynamoDB read/write capacity consumed.

## 13. Environment Configuration

Backend Lambda env vars: `TABLE_NAME`, `BEDROCK_MODEL_ID`, `BEDROCK_REGION`, `UPLOADS_BUCKET`, `LOG_LEVEL`.
Frontend env vars (Vite): `VITE_API_BASE_URL`.
No secrets are hard-coded; no AWS credentials ever ship to the frontend — the frontend only ever calls API Gateway over HTTPS.

## 14. Dependencies

Frontend: `react`, `react-dom`, `react-router-dom`, `axios` (or native fetch), `tailwindcss`, `zod` (client-side validation of forms).
Backend: `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `@aws-sdk/client-bedrock-runtime`, `@aws-sdk/s3-request-presigner`, `zod`, `uuid`.
Avoid heavy/unnecessary dependencies (no ORM, no GraphQL layer, no state-management library beyond React Context) — keep the MVP lean.

## 15. Testing Strategy

See `Rules.md` §Testing and the full matrix in this file's counterpart in `ImplementationPlan.md`. Summary: unit tests for the Repairability Engine and Repair-vs-Replace Engine (pure functions — highest ROI), integration tests for each Lambda handler against a local DynamoDB (dynamodb-local) and a mocked Bedrock client, and one end-to-end happy-path test covering the full demo flow.

## 16. Deployment Strategy

Infrastructure as Code via AWS SAM or AWS CDK (TypeScript) — either is acceptable; CDK is recommended for consistency with the TS backend. One stack per environment (`dev`, `demo`). Frontend deployed by build-and-sync to the S3 bucket + CloudFront invalidation, either manually or via a simple GitHub Actions workflow. No blue/green complexity needed for a hackathon.

## 17. Cost Considerations

See `architecture.md` §AWS Cost Control for the full breakdown. Highest-cost component by far is Bedrock (charged per input/output token); everything else (Lambda, API Gateway HTTP API, DynamoDB on-demand, S3, CloudWatch) is effectively free at hackathon-demo volume. Cost control = cap Bedrock calls to one per diagnosis, cap input token size, use the cheapest capable Bedrock model, and set a CloudWatch billing alarm early.
