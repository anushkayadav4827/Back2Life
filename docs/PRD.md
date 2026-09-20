# PRD.md — BACK2LIFE

**Tagline:** Repair Before Replacement.

## 1. Product Overview

BACK2LIFE is an AI-assisted decision-support tool that helps a person figure out, in under two minutes, whether a broken electronic device (laptop, smartphone, or headphones/earphones for the MVP) is worth repairing before they buy a replacement. The user describes the symptom, answers a short structured diagnostic, and receives: a likely-issue assessment, a transparent Repairability Score, a repair-cost vs. replacement-cost comparison, and (optionally) nearby repair providers.

## 2. Problem Statement

When a device breaks, most people default to "I need a new one" because they have no fast, trustworthy way to estimate repair cost, feasibility, or provider availability. This causes unnecessary spending, premature disposal of repairable devices, and avoidable e-waste.

## 3. Problem Context

- Repair information is scattered across forums, YouTube videos, and repair-shop word of mouth.
- Users don't know which component is likely at fault, so they can't even ask the right question at a repair shop.
- There is no single tool that turns "it stopped working" into a structured, numeric, comparable decision.

## 4. Target Users

- Students and young professionals with a broken laptop/phone/earphones and a limited budget.
- Environmentally conscious consumers who want to avoid e-waste but lack repair knowledge.
- Anyone who has ever Googled "should I repair or replace my [device]" and gotten inconsistent answers.

## 5. User Personas

**Persona A — "Budget Bhavya" (Student, 20)**
Laptop stopped charging two weeks before exams. Assumes it's dead, is pricing new laptops. Needs a fast, trustworthy signal on whether repair is realistic before spending money she doesn't have.

**Persona B — "Sustainable Sameer" (Working professional, 28)**
Earphones went silent in one ear. Doesn't want to add to e-waste but has no idea if repair is even possible for earphones, or where to take them.

## 6. Product Vision

Make "repair first" the easy, obvious, default choice by replacing guesswork with a transparent, data-backed comparison — in the same amount of time it takes to search "why is my laptop not charging."

## 7. Product Goals

- Turn a vague symptom into a likely-issue hypothesis in under 60 seconds.
- Present a repair-vs-replace comparison that is honest about uncertainty and data quality.
- Never let the AI invent prices, providers, or a final score — those come from verified/deterministic backend data.
- Demonstrate meaningful, cost-conscious AWS usage suitable for a hackathon judge to understand in one architecture slide.

## 8. Non-Goals (MVP)

- No real-time chat/general-purpose chatbot experience.
- No live integration with real repair-shop booking systems (mock providers only).
- No payment processing.
- No support for every device category — 3 categories only (laptop, smartphone, headphones/earphones).
- No claim of diagnostic certainty — this is decision support, not a certified repair diagnosis.

## 9. Core Features

1. Device selection (3 categories, P0)
2. Free-text problem description + structured yes/no diagnostic questions (P0)
3. AI symptom reasoning → likely issue(s) with reasoning (P0)
4. Deterministic Repairability Score (P0)
5. Repair-cost vs. replacement-cost comparison (P0)
6. Dangerous-symptom safety interrupt (P0 — safety-critical)
7. Mock repair provider discovery (P1)
8. Save diagnosis / repair history (P1)
9. Optional photo upload of the device fault via S3 presigned URL (P2)
10. Optional login via Cognito for cross-device history (P2)

## 10. User Journeys

**Primary journey (P0 demo path):**
Landing → Select Device → Describe Problem → Answer 3–5 diagnostic questions → AI analysis (loading) → Likely Issue + reasoning → Repairability Score → Repair vs. Replace comparison → (optional) Provider suggestions → Save to history.

**Safety journey:**
Any point where a dangerous symptom is indicated (smoke, sparks, burning smell, swollen battery, shock, exposed wiring) → immediately short-circuits the normal flow → safety warning screen → no repair instructions given, no score calculated, only "stop use, contact a qualified technician" messaging plus general safety-disposal guidance.

## 11. MVP Scope (P0/P1/P2)

| Feature                                              | Priority |
| ---------------------------------------------------- | -------- |
| Device selection (Laptop, Smartphone, Headphones)    | P0       |
| Problem description + diagnostic Q&A                 | P0       |
| Bedrock symptom reasoning (likely issue + reasoning) | P0       |
| Deterministic Repairability Score                    | P0       |
| Repair vs. Replace comparison                        | P0       |
| Dangerous-symptom safety interrupt                   | P0       |
| Result persistence in DynamoDB (session-based)       | P0       |
| Mock repair provider list                            | P1       |
| Repair history view                                  | P1       |
| Photo upload (S3 presigned URL)                      | P2       |
| Cognito login / multi-device history                 | P2       |
| Additional device categories                         | P2       |
| Real provider integrations / booking                 | P2       |

## 12. Success Criteria

- A judge can go from landing page to a completed repair-vs-replace comparison in a live demo without errors.
- Every number shown (score, cost) is traceable to either deterministic backend logic or clearly-labeled demo/mock data — never an unverified AI claim.
- Dangerous-symptom flow is demonstrably safe (never returns repair steps for hazardous symptoms).

## 13. Measurable KPIs (post-hackathon framing)

- % of diagnostic sessions that reach a final Repairability Score (completion rate).
- Average time from landing to result (target < 90 seconds).
- % of sessions where user views a repair provider.
- (Longer-term, not MVP) % of users who self-report choosing repair over replacement.

## 14. Risks

- **AI risk:** Bedrock may return malformed or overconfident output → mitigated by strict schema validation and rejecting/retrying malformed responses (see Rules.md, memory.md).
- **Data-quality risk:** MVP repair/replacement prices are demo estimates, not live market data → must be clearly labeled "Estimated" everywhere in the UI.
- **Cost risk:** Uncontrolled Bedrock calls could burn hackathon credits → mitigated by one Bedrock call per diagnosis session, capped input size, and CloudWatch billing alarms (see TechSpec.md §Cost).
- **UX risk:** Too many diagnostic questions causes drop-off → capped at 5 questions max per session.
- **Safety risk:** AI could inadvertently suggest unsafe repair steps → hard-coded safety interrupt runs before AI reasoning is ever shown to the user.

## 15. Assumptions

- Users have basic literacy in describing a device problem in one sentence.
- Demo/mock repair-provider and pricing data is acceptable for a hackathon MVP as long as it is clearly labeled.
- AWS Bedrock access (e.g., Anthropic Claude Haiku model) is available in the hackathon AWS account/region.

## 16. Limitations

- Not a certified repair diagnosis; explicitly positioned as decision support.
- Only 3 device categories and a fixed set of symptoms/issues at launch.
- Repair providers are illustrative mock data, not verified real-world businesses.

## 17. Future Scope

- Expand device categories (routers, mixers, printers, appliances).
- Real repair-provider marketplace integration with live quotes/booking.
- Crowd-sourced repair outcome data to continuously improve the Repairability Score model.
- Photo-based visual diagnosis (image classification) as an additional AI signal.
- Cognito-based accounts with cross-device repair history and reminders.
