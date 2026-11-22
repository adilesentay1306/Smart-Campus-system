# Agent Guidelines — Smart Campus Room Availability Checker

## Project overview

A single-page React + TypeScript prototype that lets users filter campus rooms
by capacity and equipment, then check time-slot availability against each room's
existing bookings. All data is hardcoded in fixtures — there is no backend,
login, or booking creation.

## Tech stack

- Vite 7 + React 18 + TypeScript 5 (strict mode)
- Tailwind CSS 3 for styling
- Vitest 5 for unit tests
- ESLint 9 + typescript-eslint for linting
- lucide-react for icons

## Architecture rules

1. **No backend, no database, no auth.** Do not add Supabase clients, API calls,
   login flows, or persistence layers. The `@supabase/supabase-js` dependency in
   package.json is unused — do not wire it in.
2. **All data is fictional and hardcoded** in `src/fixtures.ts`. Do not fetch
   data from external sources.
3. **No secrets.** Do not add API keys, tokens, or credentials anywhere in the
   repository.
4. **No external deployments.** Do not add Dockerfiles, deploy scripts, or CI
   workflows that push to a remote service. Local build only.

## Domain rules — preserve these at all times

### Time validation (AC1–AC6)

| Rule | Description | Implemented in |
|------|-------------|----------------|
| AC1  | Reject start ≥ end; reject start before fixed "now" (09:30) | `checkAvailability` |
| AC2  | Reject duration > 120 minutes | `checkAvailability` |
| AC3  | Reject blocked rooms (`isBlocked: true`); reject overlapping bookings | `checkAvailability` |
| AC4  | Reject time overlaps but allow touching endpoints (e.g. 10:00–11:00 and 11:00–12:00 do not conflict) | `overlaps()` |
| AC5  | Never mutate fixtures — `ROOMS` and all nested arrays are `Object.freeze`d | `fixtures.ts` |
| AC6  | Every result includes a human-readable message; unavailable results include conflict details | `AvailabilityResult` |

### Explain availability feature (EA1–EA4)

| Rule | Description | Implemented in |
|------|-------------|----------------|
| EA1  | `AvailabilityResult` carries a deterministic `reasonCode` (`available`, `overlap`, `blocked`, `invalid_time`, `past_time`, `duration_exceeded`) populated by `checkAvailability` | `types.ts`, `availability.ts` |
| EA2  | The explain adapter is a fully local mock — no network calls, no API keys, no secrets. Input is strictly validated (reject empty, malformed, non-object, invalid reasonCode, combined text > 200 chars, and `isAvailable !== (reasonCode === "available")`); failures return a safe fallback message | `explainAdapter.ts` |
| EA3  | Explanations are at most 2 sentences, student-friendly, and strictly grounded in the deterministic `reasonCode` — no invented facts | `explainAdapter.ts` |
| EA4  | The "Explain availability" button appears only after checking availability. The AI output is visually and textually separated from the official status and carries the disclaimer: "AI summary for convenience only — the official status above is authoritative" | `App.tsx` |

### Room filtering (F1–F5)

| Rule | Description | Implemented in |
|------|-------------|----------------|
| F1   | Filter rooms where capacity ≥ requested attendees | `filterByCapacity` |
| F2   | Filter rooms containing ALL selected required equipment | `filterByEquipment` |
| F3   | Exclude blocked rooms from the available list | `excludeBlocked` |
| F4   | Show a clear empty state when no rooms match | `App.tsx` |
| F5   | Switching selected room refreshes availability against that room's specific bookings | `App.tsx` |

## Quality gates — run all three before proposing acceptance

```bash
npm test           # vitest run — must be 0 failures
npm run lint       # eslint . — must be 0 errors
npm run typecheck  # tsc --noEmit — must exit 0
```

If any gate fails, fix the root cause before reporting the task complete. Do not
disable tests, skip lint rules inline, or use `any` to silence type errors.

## Code conventions

- Use the `@/` path alias for imports from `src/` (e.g. `@/components/Foo`), not
  deep relative paths. The alias is configured in both `tsconfig.app.json` and
  `vite.config.ts`.
- Keep functions pure where possible. `checkAvailability` and all filtering
  functions are pure — do not introduce side effects.
- Do not add comments unless the "why" is non-obvious.
- Match the existing file layout: domain logic in `src/`, types in `src/types.ts`,
  config constants in `src/config.ts`, fixtures in `src/fixtures.ts`.
- Do not install new packages unless explicitly requested.

## File map

| File | Responsibility |
|------|----------------|
| `src/types.ts` | `Booking`, `Room`, `AvailabilityResult` interfaces |
| `src/config.ts` | `FIXED_NOW`, `MAX_DURATION_MINUTES` constants |
| `src/fixtures.ts` | Hardcoded room catalog (4 rooms) with bookings |
| `src/availability.ts` | `checkAvailability` + time parsing utilities (AC1–AC6) |
| `src/filtering.ts` | Pure filtering functions (F1–F3) + combined pipeline |
| `src/App.tsx` | UI: filters, room selection, booking form, empty state (F4–F5) |
| `src/Timeline.tsx` | Visual timeline of bookings + pending request |
| `src/explainAdapter.ts` | Mock LLM adapter for the "Explain availability" feature (EA1–EA4) |
| `src/explainAdapter.test.ts` | Unit tests for the explain adapter |
| `src/availability.test.ts` | All unit tests (AC1–AC6, F1–F5) |
