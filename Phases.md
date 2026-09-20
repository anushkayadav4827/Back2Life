# Phases.md — BACK2LIFE

## Phase 0 — Architecture

**Goal:** Lock the architecture and documentation before writing app code.
**Tasks:** Finalize this documentation set; set up repo skeleton and CDK app shell.
**Dependencies:** None.
**Deliverables:** All docs in this set; empty-but-buildable repo.
**Definition of Done:** `npm run build` succeeds on an empty scaffold; docs reviewed for internal consistency.

## Phase 1 — Frontend Shell

**Goal:** All 10 screens exist and are navigable with placeholder data.
**Tasks:** Routing, layout, Tailwind setup, base components (Card, Button, ProgressBar, ScoreGauge).
**Dependencies:** Phase 0.
**Deliverables:** Clickable frontend, no live API calls yet.
**Definition of Done:** Every screen in the user journey renders without console errors.

## Phase 2 — AWS Backend Foundations

**Goal:** API Gateway + Lambda skeletons deployed, returning stub JSON.
**Tasks:** CDK stack for API Gateway + Lambda functions (empty logic); IAM roles scaffolded.
**Dependencies:** Phase 0.
**Deliverables:** Deployed API Gateway URL responding to all planned routes.
**Definition of Done:** `curl` against every route returns a 200 with a stub payload.

## Phase 3 — DynamoDB & Seed Data

**Goal:** Real data backing devices, rules, repair data, providers.
**Tasks:** CDK table+GSI, seed scripts, read-only Lambdas (`listDevices`, `getDevice`, `listProviders`).
**Dependencies:** Phase 2.
**Deliverables:** Working read endpoints against real DynamoDB data.
**Definition of Done:** Frontend device-selection screen shows real seeded devices.

## Phase 4 — Bedrock Integration & Safety

**Goal:** `analyzeDiagnosis` reliably reasons about symptoms within strict AI boundaries.
**Tasks:** Dangerous-symptom detector, Bedrock prompt + schema, validation/retry/fallback logic.
**Dependencies:** Phase 3.
**Deliverables:** `POST /diagnosis/analyze` returns valid, schema-checked AI reasoning; danger flow verified.
**Definition of Done:** Unit/integration tests pass for valid AI output, malformed AI output, and dangerous-symptom short-circuit.

## Phase 5 — Repairability Engine & Repair-vs-Replace Engine

**Goal:** Deterministic scoring and recommendation logic, fully decoupled from the AI.
**Tasks:** Implement + unit test both engines per `Design.md` formula.
**Dependencies:** Phase 3 (needs `RepairData` shape).
**Deliverables:** Pure, tested TypeScript modules wired into `analyzeDiagnosis`.
**Definition of Done:** All documented example cases produce the documented scores/recommendations.

## Phase 6 — Repair Providers

**Goal:** Provider discovery screen backed by mock data.
**Tasks:** `listProviders` Lambda + GSI1 query + frontend provider screen.
**Dependencies:** Phase 3.
**Deliverables:** Working, clearly-labeled mock provider list.
**Definition of Done:** Filtering by device category returns correct mock providers.

## Phase 7 — Security & Monitoring

**Goal:** Lock down the deployed system and make it observable.
**Tasks:** IAM review, S3 Block Public Access verification, CORS lockdown, CloudWatch alarms (billing + Lambda errors), CloudWatch dashboard.
**Dependencies:** Phases 2–6 deployed.
**Deliverables:** Passing security checklist (`Rules.md`); visible CloudWatch dashboard.
**Definition of Done:** No wildcard IAM permissions remain; billing alarm fires on a manual test.

## Phase 8 — Testing

**Goal:** Confidence in the critical path before demo.
**Tasks:** Unit tests (engines), integration tests (Lambdas), one end-to-end happy-path test, safety-flow test.
**Dependencies:** Phases 4–7.
**Deliverables:** Passing test suite; CI script (optional GitHub Action).
**Definition of Done:** All tests in `Rules.md` §Testing pass locally and (if set up) in CI.

## Phase 9 — Deployment

**Goal:** Public, stable demo environment.
**Tasks:** CDK deploy of the `demo` stack; frontend build synced to S3 + CloudFront invalidation.
**Dependencies:** Phase 8.
**Deliverables:** Public CloudFront URL.
**Definition of Done:** Full user journey works end-to-end on the public URL.

## Phase 10 — Demo Preparation

**Goal:** A reliable, rehearsed 3-minute demo.
**Tasks:** Rehearse the script in `README.md`/Hackathon Demo Flow; prepare architecture slide; record backup demo video in case of live-network issues.
**Dependencies:** Phase 9.
**Deliverables:** Recorded demo video, rehearsed live script, architecture explanation slide.
**Definition of Done:** Two consecutive clean run-throughs of the full demo script.
