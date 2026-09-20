# BACK2LIFE

**AI-powered device repair advisor** — diagnose your broken device, get a repairability score, and see a live cost comparison between repairing and replacing.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-back2life-emerald?style=flat-square)](https://d1q7f0fv7lbfv2.cloudfront.net)

---

## What it does

1. **Device intake** — Enter your device brand, model, purchase date/price, warranty status, prior repair history, and optional budget
2. **Symptom diagnosis** — Describe the problem; the AI matches it to a diagnostic rule and asks targeted yes/no questions
3. **AI analysis** — Groq LLM generates a structured diagnosis: Observed → Likely Cause → Recommended Fix → Outlook
4. **Repairability score** — A 0–100 score computed from parts availability, repair complexity, cost ratio, device age, and expected remaining life
5. **Repair vs Replace debate** — Two agents argue the case using live replacement prices (SerpApi) and real repair cost data, with deterministic cost-per-year arbitration picking the winner
6. **Local repair shops** — Google Places API finds real repair shops near you (falls back to curated demo data)
7. **History** — All completed diagnoses are saved to your account and accessible any time

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite, Tailwind CSS, AWS Amplify v6 |
| Auth | Amazon Cognito (User Pool, email/password) |
| API | AWS API Gateway HTTP API + JWT Authorizer |
| Compute | AWS Lambda (Node.js 20, TypeScript via esbuild) |
| Database | Amazon DynamoDB (single-table design, PAY_PER_REQUEST) |
| AI | Groq API (`openai/gpt-oss-120b`) with Zod schema validation |
| Pricing | SerpApi (Google Shopping), 7-day DynamoDB cache |
| Providers | Google Places Text Search API, DynamoDB cache + mock fallback |
| Secrets | AWS Secrets Manager (Google Places key) |
| IaC | AWS CDK v2 (TypeScript) |
| CDN | CloudFront + S3 |

---

## Project Structure

```
BACK2LIFE/
├── frontend/          # React + Vite SPA
│   ├── src/
│   │   ├── pages/     # Route components
│   │   ├── lib/       # API client, auth config
│   │   └── main.tsx
│   └── .env           # VITE_API_URL, Cognito config (NOT committed)
├── backend/           # Lambda handlers + shared logic
│   └── src/
│       ├── handlers/  # One file per Lambda function
│       └── lib/       # llmClient, repairabilityEngine, schemas, etc.
├── data/
│   └── seed/          # JSON seed data for DynamoDB
└── infra/
    └── cdk/           # AWS CDK stacks
        ├── bin/       # CDK app entry point
        └── lib/       # Stack definitions
```

---

## Local Development

### Prerequisites

- Node.js 20+
- AWS CLI configured (`aws configure`) OR credentials in `infra/.env`
- A deployed DynamoDB table (run `cdk deploy Back2LifeDataStack-dev` first)

### Frontend

```bash
cd frontend
cp .env.example .env   # Fill in values (see below)
npm install
npm run dev
```

### Backend (local test)

```bash
cd backend
npm install
npx tsx src/scripts/seed.ts   # Seed DynamoDB with device/rule/repair data
```

---

## Environment Variables

### `frontend/.env`

```env
VITE_API_URL=https://<your-api-id>.execute-api.us-east-1.amazonaws.com
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_COGNITO_REGION=us-east-1
```

### `infra/.env`

```env
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

GROQ_API_KEY=...
GROQ_MODEL_ID=openai/gpt-oss-120b

SERPAPI_KEY=...
```

### AWS Secrets Manager

The Google Places API key must be stored as a plain-text secret. The `listProviders` Lambda reads it at runtime:

```bash
aws secretsmanager create-secret \
  --name back2life/places-api-key \
  --secret-string "YOUR_GOOGLE_PLACES_API_KEY"
```

**Never put the Places key in an env var or `.env` file.**

---

## Deployment

Deploy all CDK stacks:

```bash
cd infra/cdk
npm install

# Set env vars (or use infra/.env)
npx cdk deploy --all --require-approval never
```

Individual stacks (in dependency order):

```bash
npx cdk deploy Back2LifeAuthStack-dev
npx cdk deploy Back2LifeDataStack-dev
npx cdk deploy Back2LifeApiStack-dev
npx cdk deploy Back2LifeFrontendStack-dev
npx cdk deploy Back2LifeMonitoringStack-dev
```

After deploying the frontend stack, build and sync:

```bash
cd frontend
npm run build
# Sync dist/ to S3 and invalidate CloudFront (see infra outputs for bucket name)
```

Seed DynamoDB after first deploy:

```bash
cd backend
npx tsx src/scripts/seed.ts
```

---

## AI Constraints

The LLM is intentionally constrained — it **only** interprets symptoms and narrates arguments using numbers the backend calculated. It never:

- Invents repair costs or prices
- Overrides the deterministic repair-vs-replace winner
- Makes up parts availability data

All prices come from SerpApi (live) or RepairData (seeded). The repairability score and cost-per-year arbitration are pure deterministic functions.

---

## Architecture

See [architecture.md](./architecture.md) for the full system design including sequence diagrams, data model, and Lambda inventory.

---

## License

MIT
