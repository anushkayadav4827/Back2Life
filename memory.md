# memory.md — BACK2LIFE

(This document is about application **state/context management**, not AWS MemoryDB — no such service is used in this project.)

## 1. Frontend State

- `DiagnosisSessionContext` (React Context): holds the active `sessionId`, selected device, problem text, in-progress answers, and the latest result payload for the current session only. Cleared when a new diagnosis starts.
- `localStorage`: only the anonymous `sessionId` (UUID) persists across visits, so returning users can view their own repair history without login.
- No AWS credentials, API keys, or Bedrock prompts are ever stored client-side.

## 2. Diagnostic Session State

- Created server-side by `startDiagnosis` (`DiagnosisSession` item, status `IN_PROGRESS`).
- Updated by `analyzeDiagnosis` to status `COMPLETE` with the final result attached.
- TTL of 30 days — sessions are working/ephemeral state, not a permanent record. Permanent records live only in `RepairHistory`, and only if the user explicitly chooses to save.

## 3. Backend State

Backend Lambdas are stateless between invocations; all state lives in DynamoDB. No Lambda holds diagnosis data in memory across requests.

## 4. DynamoDB Persistence

- `DiagnosisSessions`: ephemeral (TTL), one per diagnostic attempt.
- `RepairHistory`: permanent (until user deletes), one item per explicitly-saved result, scoped by anonymous `sessionId`.
- `Devices`, `DiagnosticRules`, `RepairData`, `Providers`: static/reference data, seeded once, rarely updated.

## 5. What Information Should Be Sent to Bedrock

Only, per call:

```json
{
  "device": "laptop",
  "problemText": "Laptop not charging",
  "answers": { "charging_led": false, "works_on_battery": true }
}
```

That's it — device category, the user's own problem description (capped at 300 chars), and the structured yes/no answers for that session.

## 6. What Should NOT Be Sent to Bedrock

- No conversation history across sessions.
- No `sessionId`, no `localStorage` identifiers, no IP address, no device/browser fingerprint.
- No pricing data, no provider data, no full `DiagnosticRules`/`RepairData` table contents (the model does not need them — pricing and scoring happen after the AI call, in deterministic code).
- No uploaded photos (P2 image upload is stored in S3 only; visual analysis is out of MVP scope and not sent to Bedrock).

## 7. Session Handling

Each diagnosis is a self-contained request/response cycle: `startDiagnosis` → user answers → `analyzeDiagnosis` (single Bedrock call) → result persisted. No multi-turn conversation state is maintained with Bedrock — every call is a fresh, minimal-context request, which keeps both cost and prompt-injection surface area low.

## 8. Privacy Considerations

- No account/login required for MVP — no email, name, or PII is collected.
- The anonymous `sessionId` is a random UUID with no personally identifying meaning; it cannot be linked to a real identity without the user separately providing one (which the MVP never asks for).
- Repair history and diagnosis sessions are only ever readable via that same `sessionId`, never listable across users.
- If Cognito is added later (P2), user PII (email) would be handled by Cognito directly, not stored in `Back2LifeTable`, and diagnosis data would be re-keyed to the Cognito `sub` instead of the anonymous session ID.
