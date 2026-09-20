# Design.md — BACK2LIFE

## 1. Design Philosophy

Feels like **trustworthy consumer technology with a sustainability conscience** — closer to a clean fintech or health-diagnostic app than a chatbot. Calm, confident, numeric, never gimmicky. Every claim on screen is visually tied to its source (AI-reasoned vs. verified data vs. calculated score) so the user always knows how much to trust what they're seeing.

## 2. Color Direction

- **Primary:** Deep forest green (`#1F6F4A`) — repair/sustainability, trust, "go" signal.
- **Secondary:** Warm slate (`#3A4750`) — neutral technical tone for data/cards.
- **Accent (replace/caution):** Amber (`#D97706`) — used for "replacement may be better" and general caution, never alarming.
- **Danger (safety):** Red (`#DC2626`) — reserved exclusively for the dangerous-symptom safety screen. Never used elsewhere, so its appearance always signals real urgency.
- **Background:** Off-white (`#FAFAF8`) light mode; deep slate (`#111827`) dark mode.
- **Score gradient:** Red→Amber→Green across the 0–100 Repairability Score gauge, matching the bands in §9.

## 3. Typography

- Headings: Inter or Sora, semi-bold.
- Body: Inter, regular, 16px base.
- Numeric data (scores, prices): tabular-nums variant so numbers align in comparisons.

## 4. Spacing

8px base grid. Card padding 24px. Section vertical rhythm 32–48px. Generous whitespace to keep the diagnostic flow feeling calm, not clinical/cramped.

## 5. Cards

Rounded-xl (12px), soft shadow, 1px hairline border. Each result card (Likely Issue, Score, Comparison, Provider) has a small top-left label tag indicating its source: "AI-assessed," "Calculated," or "Demo data" — this is a core trust device for the whole product.

## 6. Buttons

Primary (filled, forest green) for forward progress. Secondary (outline) for back/skip. Destructive/never used except discard-history actions. Large tap targets (min 44px height) for mobile.

## 7. Forms

Yes/No diagnostic questions render as large two-button toggles (not radio buttons) — faster to tap, clearer at a glance. Free-text problem input is a single-line field with a character counter (max 300) and 3–4 example placeholder prompts that rotate.

## 8. Progress Indicators

A slim top progress bar across the 5-step flow (Device → Problem → Questions → Analysis → Result). Question screens additionally show "Question 2 of 4."

## 9. Loading States

Analysis screen shows a short (2–4 second target) animated state with rotating micro-copy ("Reviewing your symptoms…", "Checking repair data…") — never a bare spinner, so the wait feels purposeful.

## 10. Error States

Each error maps to a friendly, specific message (never a raw error code) plus a clear next action ("Try again," "Choose a different device"). Errors never block the whole app — only the affected screen/section.

## 11. Empty States

- No history yet: illustration + "Run your first diagnosis to start building your repair history."
- No providers for area: "No demo providers listed for this category yet — here's general guidance instead."

## 12. Accessibility

- WCAG AA contrast minimum on all text.
- All yes/no toggles and score gauge have text-equivalent labels for screen readers (score gauge is never color-only — always paired with the numeric value and band label).
- Full keyboard navigability through the diagnostic flow.

## 13. Responsive Behavior

Mobile-first. Diagnostic flow is single-column on all breakpoints. Score + comparison screens switch from stacked (mobile) to side-by-side (tablet/desktop) cards.

## 14. Screen-by-Screen Spec

**Landing:** Hero headline ("Repair before replacement."), 1-line value prop, 3 device-icon quick-starts, trust strip ("AI-assisted reasoning · Transparent scoring · Real repair data").

**Diagnostic screen(s):** One question per screen (or grouped 2–3 max), progress bar, back button, large yes/no toggles.

**Result screen (Likely Issue):** Primary issue name + plain-language reason (tagged "AI-assessed, preliminary"), list of other possible causes, explicit "This is a preliminary assessment, not a certified diagnosis" note.

**Repairability Score:** Large circular gauge (0–100), band label (Excellent/Good/Fair/Poor/Not Recommended), a 4-row breakdown (parts availability, complexity, cost ratio, expected usability) — tagged "Calculated."

**Cost comparison:** Two side-by-side cards — Repair (estimated ₹ range, time) vs. Replace (estimated ₹ range) — with a neutral one-line recommendation sentence, tagged "Calculated from repair data."

**Providers:** Card list, "Demo Providers" banner at top, name/rating/contact per card.

**History:** Chronological list of saved sessions (device icon, issue, score, date), tap to re-open the full result.

## 15. Repairability Score — Formula (deterministic, backend-only)

**Factors and weights:**

| Factor                       | Weight | Source                                                                                             |
| ---------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| Parts availability           | 30%    | `RepairData.partsAvailability` (GOOD=100, MEDIUM=60, POOR=20)                                      |
| Repair cost ratio            | 30%    | `1 - (avgRepairCost / avgReplacementCost)`, clamped to [0,1], ×100                                 |
| Repair complexity            | 20%    | `RepairData.repairComplexity` (LOW=100, MEDIUM=60, HIGH=20)                                        |
| Device age factor            | 10%    | Newer devices score higher (0–1yr=100, 1–3yr=70, 3–5yr=40, 5yr+=15); defaults to 70 if age unknown |
| Expected remaining usability | 10%    | `min(expectedRemainingUsabilityYears / 3, 1) × 100`                                                |

**Formula:**

```
score = round(
  0.30 * partsAvailabilityScore +
  0.30 * costRatioScore +
  0.20 * complexityScore +
  0.10 * ageFactorScore +
  0.10 * usabilityScore
)
```

**Bands:**

| Range  | Label                                     |
| ------ | ----------------------------------------- |
| 80–100 | Excellent — repair strongly favored       |
| 60–79  | Good — repair likely worthwhile           |
| 40–59  | Fair — repair possible, compare carefully |
| 20–39  | Poor — replacement likely more practical  |
| 0–19   | Not recommended — replacement favored     |

**Worked example (laptop, charging_port):** avgRepairCost=₹800, avgReplacementCost=₹47,500 → costRatioScore = (1 − 0.0168) × 100 ≈ 98. partsAvailability=GOOD=100. complexity=MEDIUM=60. age unknown→70. usability=2yrs → min(2/3,1)×100≈67.
`score = 0.30(100) + 0.30(98) + 0.20(60) + 0.10(70) + 0.10(67) = 30 + 29.4 + 12 + 7 + 6.7 ≈ 85` → **Excellent**.

**Edge cases:** if `RepairData` is missing for the matched issue → score cannot be calculated → UI shows "Insufficient repair data for a score" instead of a fabricated number (never default to a guessed score). If repair cost ≥ replacement cost, costRatioScore clamps to 0, not negative.

## 16. Repair-vs-Replace Engine — Logic

Deterministic comparison, not AI-generated:

- If `score ≥ 60` AND `avgRepairCost < 0.5 × avgReplacementCost` → **"repair_recommended"**
- If `score ≤ 30` OR `avgRepairCost ≥ 0.8 × avgReplacementCost` → **"replacement_recommended"**
- Otherwise → **"neutral"** ("Both options are reasonable — consider your device's age and how much longer you need it.")
  Output always includes a `confidence` field: `"high"` if `isDemoData` is false and both cost ranges are present, `"demo_estimate"` otherwise (MVP will typically show `"demo_estimate"` — this is expected and correctly labeled in the UI).
