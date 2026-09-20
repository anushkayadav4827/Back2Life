# Documentation.md — BACK2LIFE

## 1. Prerequisites

- Node.js 20+, npm
- AWS CLI v2, configured with credentials for the hackathon account
- AWS CDK v2 (`npm install -g aws-cdk`)
- Docker (for `dynamodb-local` during development)

## 2. Local Development

```bash
git clone <repo>
cd back2life
npm install
npm run dynamodb:local        # starts dynamodb-local via Docker
npm run seed:local            # loads /data/seed into local DynamoDB
npm run dev:backend           # runs Lambdas locally via `sam local` or CDK's local invoke
npm run dev:frontend          # Vite dev server, http://localhost:5173
```

Set `VITE_API_BASE_URL=http://localhost:3000` (or your local API Gateway emulator URL) in `frontend/.env.local`.

## 3. AWS Configuration

- Ensure the target AWS region has Bedrock model access enabled for the chosen model (Anthropic Claude Haiku-class) — this must be requested/enabled in the Bedrock console before first deploy.
- Bootstrap CDK once per account/region: `cdk bootstrap`.

## 4. Environment Variables

**Backend Lambda:** `TABLE_NAME`, `BEDROCK_MODEL_ID`, `BEDROCK_REGION`, `UPLOADS_BUCKET`, `LOG_LEVEL`
**Frontend:** `VITE_API_BASE_URL`
Set via CDK context/parameters for deployed environments; via `.env.local` (gitignored) for local dev.

## 5. Database Setup

`cdk deploy Back2LifeDataStack` creates `Back2LifeTable` with GSI1 (and optional GSI2). Run `npm run seed:<env>` after first deploy to load devices/rules/repair-data/providers (all clearly marked demo data).

## 6. S3 Setup

`cdk deploy Back2LifeStorageStack` creates the frontend bucket (private, CloudFront OAC) and the uploads bucket (private, presigned-URL-only access, 30-day lifecycle rule). Never enable public access on either bucket.

## 7. Lambda Setup

Each Lambda is bundled via esbuild (through CDK's `NodejsFunction` construct) from `/backend/src/handlers/*.ts`, sharing the `/backend/src/lib` Lambda Layer.

## 8. API Gateway Setup

`cdk deploy Back2LifeApiStack` creates an HTTP API with routes mapped to each Lambda, CORS restricted to the CloudFront domain, and (in `demo`) a custom domain if one is available.

## 9. Bedrock Setup

No separate deploy step — Lambdas call Bedrock Runtime directly via the AWS SDK using the IAM permissions granted to the `analyzeDiagnosis` role (`bedrock:InvokeModel` scoped to the specific model ARN only).

## 10. Deployment

```bash
cdk deploy --all --context env=demo
cd frontend && npm run build
aws s3 sync dist/ s3://back2life-frontend-demo --delete
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

## 11. Testing

```bash
npm run test:unit          # Repairability + Repair-vs-Replace engines
npm run test:integration   # Lambda handlers vs dynamodb-local + mocked Bedrock
npm run test:e2e           # full demo-flow test (Playwright/Cypress)
```

## 12. Troubleshooting

- **Bedrock `AccessDeniedException`:** model access not enabled in this region/account — enable it in the Bedrock console.
- **CORS errors in browser:** confirm `VITE_API_BASE_URL` matches the deployed API Gateway URL and that the CloudFront domain is in the API's allowed origins.
- **Empty device list:** seed script wasn't run against the target environment's table.
- **Malformed AI output in logs:** expected occasionally — confirm the fallback path returned a valid (if generic) result to the user; if not, check the Zod schema against the latest Bedrock model output format.

## 13. Security

See `Rules.md` §Security Rules for the full checklist; re-verify before every demo deploy: S3 Block Public Access, IAM least privilege, no secrets committed, CORS locked down.

## 14. Cost Monitoring

Check the CloudWatch billing alarm and dashboard daily during the hackathon. Bedrock is the only service with meaningful per-request cost — monitor its invocation count specifically.

## 15. Limitations

See `PRD.md` §16. In short: demo/mock pricing and provider data, 3 device categories only, no certified diagnosis claim.

## 16. Future Development

See `PRD.md` §17 for the full future-scope list (real provider marketplace, more device categories, crowd-sourced score data, image-based diagnosis, Cognito accounts).
