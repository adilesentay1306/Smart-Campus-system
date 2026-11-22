# Project memory

## Product intent & audience

- Smart Campus Room Availability Checker: lets students check campus study-room availability and understand why a room is/isn't available.
- New optional "Explain availability" feature produces a short, student-friendly, AI-labeled explanation of the deterministic availability result.

## Brand personality & voice

- Student-friendly, concise, grounded tone for explanations (≤ 2 sentences).
- Explanations strictly derived from deterministic result; no invented facts.

## Visual design & UX direction

- React + JSX + Tailwind CSS + lucide-react icons (per `.bolt/prompt` constraints).
- "Explain availability" button appears only after checking availability; explanation rendered below the official status.
- AI output visually and textually separated from official deterministic status via disclaimer: "AI summary for convenience only — official status above is authoritative" (AC5).
- Existing UI includes room selection, time inputs, equipment toggle, reset action.

## Decisions, constraints & rationale

- No login, no database, no backend, no real personal data, no client-side API secrets.
- LLM is a mock adapter (`src/explainAdapter.ts`), fully local; no network/API keys.
- Adapter input: `{ roomLabel, startTime, endTime, isAvailable, reasonCode }`; output: `{ explanation: string }`.
- Strict validation: reject empty, malformed, non-object, invalid reasonCode, combined text > 200 chars; failures return safe fallback message.
- Simulated `timeout` and `api_error` modes supported for failure testing.
- `reasonCode` derived from existing `AvailabilityResult` via helper in adapter.
- Explanation state cleared on reset and on equipment toggle.
- Existing booking rules, AGENTS.md, and all prior tests preserved unchanged.
- Path alias `@/` → `src/`; deep relative imports avoided.

## Open questions & assumptions

- Real LLM integration intentionally deferred; adapter contract designed to be swappable later.
- "reasonCode" set assumed stable/enum-like; invalid values rejected by adapter validation.
- Vitest as test runner inferred from existing 60-test availability suite + 13 new adapter tests.
- Quality gates: `npm test`, `npm run lint`, `npm run typecheck` all expected to pass (currently 73 tests green).