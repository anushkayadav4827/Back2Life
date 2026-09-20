# ImplementationPlan.md — BACK2LIFE

Each step is small, verifiable, and ordered so nothing later depends on something not yet built.

---

### Step 1 — Repo & tooling scaffold

- **Objective:** Empty but correctly structured monorepo.
- **Files/services:** `/frontend`, `/backend`, `/infra`, `/data`, `/docs`, `/tests` (see folder structure below).
- **Task:** `npm init` workspaces, TypeScript configs, ESLint/Prettier.
- **Expected output:** `npm run build` succeeds with no code yet.
- **Dependencies:** none.
- **Testing:** N/A.
- **Done when:** repo builds clean, folder structure matches spec.

### Step 2 — DynamoDB table + seed data (local)

- **Objective:** `schema.md` model exists and is seedable.
- **Files:** `/infra/cdk/lib/dynamo-stack.ts`, `/data/seed/*.json`
- **Task:** Define table + GSI1 in CDK; write seed script loading devices, rules, repair data (3 devices × ~4 issues each), 15 mock providers.
- **Output:** `npm run seed:local` populates dynamodb-local.
- **Dependencies:** Step 1.
- **Testing:** Script exits 0, item counts match seed files.
- **Done when:** all access patterns in `schema.md` §3 can be manually queried successfully.

### Step 3 — Core Lambdas: devices & providers (read-only, no AI)

- **Objective:** `GET /devices`, `GET /devices/{id}`, `GET /providers` working end-to-end against DynamoDB.
- **Task:** Implement handlers + Zod response validation + shared `lib/` DynamoDB client.
- **Output:** curl against local SAM/CDK-invoked Lambda returns seeded data.
- **Dependencies:** Step 2.
- **Testing:** Integration tests against dynamodb-local.
- **Done when:** all three endpoints pass tests.

### Step 4 — Repairability Engine (pure function, deterministic)

- **Objective:** `lib/repairabilityEngine.ts` implementing the exact formula in `Design.md`.
- **Task:** Implement + unit test with edge cases (missing data, min/max score bounds).
- **Output:** 100% unit-test coverage of the scoring function.
- **Dependencies:** Step 1.
- **Done when:** all example cases in `Design.md` produce the documented scores.

### Step 5 — Repair-vs-Replace Engine

- **Objective:** `lib/repairVsReplaceEngine.ts` — deterministic recommendation text + confidence flag.
- **Task:** Implement + unit test.
- **Dependencies:** Step 4.
- **Done when:** unit tests cover repair-favored, replace-favored, and "too close to call" cases.

### Step 6 — `startDiagnosis` Lambda

- **Objective:** `POST /diagnosis/start` returns a sessionId + the right diagnostic questions for the symptom.
- **Task:** Match `problemText`/symptom to a `DiagnosticRule`, create `DiagnosisSession` (status IN_PROGRESS).
- **Dependencies:** Steps 2–3.
- **Testing:** Integration test: known problem text → expected question set.
- **Done when:** session is persisted and questions returned.

### Step 7 — Bedrock integration (`analyzeDiagnosis`, part A: safety + AI call)

- **Objective:** Dangerous-symptom short-circuit + Bedrock call with strict JSON contract.
- **Task:** Implement dangerous-flag check (runs BEFORE any Bedrock call); implement Bedrock prompt + Zod schema validation of the response; implement one retry + rule-based fallback.
- **Dependencies:** Step 6.
- **Testing:** Mocked Bedrock client — test valid response, malformed response (triggers retry), and dangerous-symptom short-circuit (Bedrock never called).
- **Done when:** dangerous inputs never reach Bedrock, and malformed AI output never reaches the user un-validated.

### Step 8 — `analyzeDiagnosis` part B: engines + persistence

- **Objective:** Wire validated AI output → RepairData lookup → Repairability Engine → Repair-vs-Replace Engine → persist result on the session.
- **Dependencies:** Steps 4, 5, 7.
- **Testing:** End-to-end integration test for the full "laptop not charging" example from the spec.
- **Done when:** `POST /diagnosis/analyze` returns the full result payload matching `schema.md` example.

### Step 9 — Remaining endpoints

- **Objective:** `GET /diagnosis/{id}`, `POST /repair-history`, `GET /repair-history`, `POST /upload-url` (P2).
- **Dependencies:** Step 8.
- **Done when:** full API contract in `schema.md`/README is implemented and tested.

### Step 10 — Frontend scaffold + routing

- **Objective:** 10-screen React app shell with routing and empty states, no API calls yet.
- **Dependencies:** Step 1.
- **Done when:** clicking through every screen works with placeholder content.

### Step 11 — Frontend wired to API (happy path)

- **Objective:** Full click-through demo flow using the real backend.
- **Dependencies:** Steps 3, 6, 8, 9, 10.
- **Testing:** Manual + one Cypress/Playwright end-to-end test of the full demo path.
- **Done when:** the exact hackathon demo script (Phases.md / Hackathon Demo section) runs without errors.

### Step 12 — Safety screen + error states

- **Objective:** Dangerous-symptom UI, all API-error UI states (loading, error, empty).
- **Dependencies:** Step 11.
- **Done when:** every error code in `schema.md` has a corresponding, non-crashing UI state.

### Step 13 — Security pass

- **Objective:** IAM least-privilege review, S3 Block Public Access confirmed, input validation audit, CORS locked to CloudFront domain only.
- **Dependencies:** all prior steps.
- **Done when:** `Rules.md` security checklist is fully satisfied.

### Step 14 — CloudWatch + cost guardrails

- **Objective:** Billing alarm, error-rate alarm, dashboard.
- **Dependencies:** deployed infra (any prior AWS deploy).
- **Done when:** alarms visible in CloudWatch console and tested by triggering a deliberate error.

### Step 15 — Deploy (demo environment) + smoke test

- **Objective:** CDK deploy to `demo` stack, frontend synced to S3/CloudFront.
- **Dependencies:** all prior steps.
- **Done when:** the public CloudFront URL runs the full demo flow successfully.

### Step 16 — Demo rehearsal & polish

- **Objective:** Run the exact 3-minute demo script twice, fix any rough edges.
- **Dependencies:** Step 15.
- **Done when:** two consecutive clean runs of the demo script.
