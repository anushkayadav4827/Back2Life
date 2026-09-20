# Tracker.md — BACK2LIFE

Status values: `TODO`, `IN PROGRESS`, `BLOCKED`, `DONE`

| Task ID | Task                                               | Phase | Priority | Status | Dependency  | Acceptance Criteria                        |
| ------- | -------------------------------------------------- | ----- | -------- | ------ | ----------- | ------------------------------------------ |
| T01     | Repo & tooling scaffold                            | 0     | P0       | DONE   | —           | `npm run build` succeeds                   |
| T02     | CDK: DynamoDB table + GSI1                         | 3     | P0       | DONE   | T01         | Table deploys, GSI1 queryable              |
| T03     | Seed data: devices/rules/repairdata/providers      | 3     | P0       | DONE   | T02         | Seed script populates all entities         |
| T04     | Lambda: listDevices / getDevice                    | 2     | P0       | DONE   | T03         | Endpoints return seeded devices            |
| T05     | Lambda: listProviders                              | 6     | P1       | DONE   | T03         | Filter by device category works            |
| T06     | Repairability Engine (unit)                        | 5     | P0       | DONE   | T01         | All example cases match spec               |
| T07     | Repair-vs-Replace Engine (unit)                    | 5     | P0       | DONE   | T06         | Repair/replace/tie cases pass              |
| T08     | Lambda: startDiagnosis                             | 2     | P0       | DONE   | T04         | Returns sessionId + questions              |
| T09     | Dangerous-symptom detector                         | 4     | P0       | DONE   | T08         | Never calls Bedrock on danger flags        |
| T10     | Bedrock integration + Zod validation + fallback    | 4     | P0       | DONE   | T09         | Malformed AI output never reaches user     |
| T11     | Lambda: analyzeDiagnosis (full)                    | 4/5   | P0       | DONE   | T06,T07,T10 | Full result payload correct                |
| T12     | Lambda: getDiagnosis                               | 2     | P0       | DONE   | T08         | Returns persisted session                  |
| T13     | Lambda: repair-history (create/list)               | 2     | P1       | DONE   | T11         | History saved & retrievable                |
| T14     | Lambda: getUploadUrl (presigned)                   | 2     | P2       | DONE   | T02         | Valid presigned PUT URL issued             |
| T15     | Frontend scaffold + routing (10 screens)           | 1     | P0       | DONE   | T01         | All screens navigable                      |
| T16     | Frontend: device/problem/question screens wired    | 1     | P0       | DONE   | T04,T08,T15 | Real questions render                      |
| T17     | Frontend: analysis/result/score/comparison screens | 1     | P0       | DONE   | T11,T15     | Full result renders correctly              |
| T18     | Frontend: safety warning screen                    | 1     | P0       | DONE   | T09,T15     | Danger flow shows warning, no repair steps |
| T19     | Frontend: providers + history screens              | 1     | P1       | DONE   | T05,T13,T15 | Providers/history render                   |
| T20     | Frontend: error/loading/empty states               | 1     | P0       | DONE   | T16,T17     | No unhandled UI errors                     |
| T21     | IAM least-privilege review                         | 14    | P0       | DONE   | T15         | No wildcard permissions except explicit    |
| T22     | CloudWatch alarms (billing + errors)               | 14    | P1       | DONE   | T23         | Alarms visible in dashboard                |
| T23     | Deploy demo environment                            | 14    | P0       | DONE   | T21,T22     | Public URL fully functional                |
| T24     | End-to-end demo test                               | 8/10  | P0       | DONE   | T23         | Two clean demo runs                        |
| T25     | README + Documentation.md finalize                 | 10    | P0       | DONE   | T24         | Docs match final implementation            |
