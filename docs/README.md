# BACK2LIFE

**Repair Before Replacement.**

BACK2LIFE is an AI-assisted decision-support tool that helps people figure out — in under two minutes — whether a broken laptop, smartphone, or pair of headphones/earphones is worth repairing before they buy a replacement.

## The Problem

When a device breaks, most people assume "I need a new one," because there's no fast, trustworthy way to estimate repair cost, feasibility, or where to get it fixed. That causes unnecessary spending, premature disposal of repairable devices, and avoidable e-waste.

## The Solution

Describe the problem → answer a few yes/no diagnostic questions → get an AI-reasoned likely issue, a transparent, deterministically-calculated **Repairability Score**, and a repair-vs-replace cost comparison — backed by verified/labeled repair data, never AI-invented numbers.

## Features

- Structured symptom diagnosis (not a generic chatbot)
- AI-assisted likely-issue reasoning (Amazon Bedrock)
- Deterministic, transparent Repairability Score (0–100)
- Repair vs. replace cost comparison
- Dangerous-symptom safety interrupt (smoke/sparks/swollen battery → stop + advise a technician)
- Demo repair-provider discovery
- Saved diagnosis history

## Architecture

```
React (S3 + CloudFront)
        │  HTTPS
        ▼
API Gateway (HTTP API)
        │
        ▼
Lambda (Node.js/TS, one function per route)
   ├── Amazon Bedrock   → symptom reasoning only
   ├── DynamoDB         → devices, rules, repair data, providers, sessions, history
   └── S3 (uploads)     → optional photo evidence, presigned URLs
        │
        ▼
CloudWatch (logs, alarms) + IAM (least privilege)
```

Full diagrams in [`architecture.md`](./architecture.md).

## AWS Services

S3, CloudFront, API Gateway, Lambda, DynamoDB, Amazon Bedrock, CloudWatch, IAM. (Optional: Cognito, Amplify Hosting, Bedrock Guardrails.) Deliberately no EC2/RDS/ECS/VPC complexity — see `architecture.md` §14 for rationale.

## AI Architecture & Boundaries

Bedrock is used **only** for interpreting symptoms into a likely issue with a plain-language reason. It never sets prices, never invents providers, and never computes the final score — those are always deterministic backend calculations against verified/demo data. Full boundary rules in [`Rules.md`](./Rules.md) and [`memory.md`](./memory.md).

## Screenshots

_[placeholder — landing page]_
_[placeholder — diagnostic question screen]_
_[placeholder — Repairability Score result]_
_[placeholder — repair vs. replace comparison]_

## Setup

See [`Documentation.md`](./Documentation.md) for full local-dev and AWS setup instructions.

```bash
npm install
npm run dynamodb:local && npm run seed:local
npm run dev:backend
npm run dev:frontend
```

## Deployment

```bash
cdk deploy --all --context env=demo
cd frontend && npm run build && aws s3 sync dist/ s3://back2life-frontend-demo --delete
```

## Testing

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Project Structure

```
/frontend     React + TS + Vite SPA
/backend      Lambda handlers + shared lib/ (engines, DynamoDB client, Zod schemas)
/infra        AWS CDK (TypeScript) stacks
/data         Seed/demo data (devices, rules, repair data, providers)
/docs         This documentation set
/tests        Unit, integration, and e2e tests
```

## Limitations

Demo/estimated repair and replacement pricing, mock repair providers (not real verified businesses), 3 device categories at launch, and this is decision support — not a certified repair diagnosis.

## Future Scope

Real provider marketplace integration, more device categories, crowd-sourced score-model data, image-based visual diagnosis, optional Cognito accounts. Full list in [`PRD.md`](./PRD.md) §17.
