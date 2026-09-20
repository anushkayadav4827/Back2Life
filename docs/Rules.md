# Rules.md — BACK2LIFE

## AWS Rules

- No EC2, ECS, EKS, RDS, NAT Gateway, ElastiCache, or OpenSearch unless a genuine new requirement emerges.
- No Lambda outside its own VPC unless it needs to reach a private resource (it doesn't, for this MVP) — VPC-attaching a Lambda unnecessarily increases cold-start time and cost.
- Every Lambda gets its own IAM execution role, scoped to only the table/bucket/model it actually touches.
- Never grant `dynamodb:*`, `s3:*`, or `AdministratorAccess` to any role.
- Set a CloudWatch billing alarm before writing the first line of Bedrock-calling code.

## Coding Rules

- TypeScript strict mode everywhere (frontend and backend).
- No `any` in shared `lib/` code (score/comparison engines).
- One Lambda handler = one file; business logic lives in `lib/`, not inline in the handler.
- No dead code / commented-out blocks committed.

## Architecture Rules

- The AI layer (Bedrock) may only be called from `analyzeDiagnosis`. No other Lambda may call Bedrock.
- The Repairability Score and Repair-vs-Replace recommendation are **always** computed by deterministic backend code — never by the LLM, never on the frontend.
- Dangerous-symptom detection runs **before** any Bedrock call, as pure deterministic logic against `DiagnosticRules.dangerousFlags`.

## AI Rules

- AI may: interpret symptoms, propose likely issues with a plain-language reason, suggest follow-up questions, summarize repair information already in the data.
- AI may never: invent prices, invent parts availability, invent repair providers, invent repair time, compute the final score, claim a definitive diagnosis, guarantee repair success or remaining device lifespan, or produce dangerous electrical repair steps.
- All AI output must pass Zod schema validation before use. Invalid output → one retry → deterministic rule-based fallback. Never show raw unvalidated AI text to the user.
- Required wording: "Likely issue," "Possible cause," "Preliminary assessment," "Based on the symptoms provided." Forbidden wording: definitive diagnosis claims, guaranteed savings, guaranteed lifespan extension.

## Security Rules

- HTTPS only, everywhere (CloudFront + API Gateway both enforce TLS).
- All S3 buckets: Block Public Access ON. Frontend bucket served only via CloudFront Origin Access Control.
- All Lambda input validated with Zod before touching business logic.
- No AWS credentials, API keys, or secrets in frontend code or committed to Git.
- Environment variables only, never hard-coded config.
- CORS restricted to the deployed CloudFront domain (and `localhost` in dev only).
- Prompt-injection defense: user-supplied free text is only ever placed inside a clearly delimited "user data" field of the Bedrock prompt, with an explicit system instruction that content inside that field is data, not instructions.

## Database Rules

- Single-table design only — do not introduce a second table without updating `schema.md` and this file together.
- All demo/mock records (`RepairData`, `Providers`) must include `isDemoData: true` / `isMockData: true`.
- `DiagnosisSession` items use TTL (30 days) to auto-expire — this is ephemeral working data, not permanent history.

## API Rules

- Every endpoint returns the standard `{ success, data }` / `{ success: false, error }` envelope.
- Every endpoint validates its input with a Zod schema before doing any work.
- No endpoint returns raw DynamoDB item shape (PK/SK) to the client — always map to a clean DTO.

## UI Rules

- Every price shown is labeled "Estimated" or "Demo data."
- Every provider list is labeled "Demo Providers — not verified real businesses" for the hackathon build.
- The safety warning screen is visually distinct (red/amber) and never shares a screen with normal diagnostic content.

## Testing Rules

- The Repairability Engine and Repair-vs-Replace Engine must have unit tests before any Lambda that calls them is considered done.
- Every Lambda handler needs at least one happy-path and one failure-path integration test.
- The full demo flow needs one end-to-end test.

## Error Handling Rules

- Never expose stack traces, AWS resource names/ARNs, or DynamoDB internals in API responses.
- Every caught error is logged to CloudWatch with enough context to debug, and returned to the client as a generic coded error.

## Cost Control Rules

- One Bedrock call per diagnosis session, maximum.
- Bedrock input payload capped (device + problem text + answers only — no conversation history, no full rule sets).
- Use the smallest/cheapest Bedrock model that reliably produces valid structured output (Claude Haiku-class).
- Review CloudWatch cost dashboard daily during the hackathon.

## Git Rules

- Feature branches, one PR per ImplementationPlan step where practical.
- No secrets, `.env` files, or AWS credentials committed — `.gitignore` from day one.

## Environment Variable Rules

- All config (table name, region, model ID, bucket name, API base URL) via env vars, documented in `Documentation.md`.

## Dependency/Library Rules

- Prefer AWS SDK v3 modular clients over the monolithic v2 SDK.
- No new dependency added without a one-line justification in the PR description.

## Data Validation Rules

- All boolean diagnostic answers validated as strict booleans.
- All free-text problem descriptions length-capped (e.g., 300 chars) before being sent to Bedrock.

## What NOT To Do

- Do NOT let Bedrock calculate the Repairability Score.
- Do NOT let Bedrock invent prices, providers, or repair times.
- Do NOT give any Lambda `AdministratorAccess` or overly broad IAM.
- Do NOT make the frontend call Bedrock, DynamoDB, or S3 directly — always go through API Gateway → Lambda.
- Do NOT skip the dangerous-symptom check "just for the demo."
- Do NOT present demo/mock data as verified real-world data.
- Do NOT build a general-purpose chatbot UI — the AI is embedded inside a structured flow, not a chat window.
- Do NOT leave TODO placeholders in core (P0) functionality.
