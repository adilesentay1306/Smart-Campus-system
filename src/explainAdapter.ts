// ---------------------------------------------------------------------------
// Mock LLM adapter — "Explain availability" feature
//
// This module is a deterministic, fully local mock of an LLM explanation
// service. It takes the result of the official availability checker and
// produces a short, student-friendly explanation. It never invents facts
// beyond what the deterministic result provides.
//
// Design constraints:
//   - No network calls, no API keys, no secrets.
//   - Input is strictly validated; malformed input returns a fallback message.
//   - Simulated timeout / API-error modes exercise the fallback path in tests.
//   - Output is at most two sentences.
// ---------------------------------------------------------------------------

import type { ReasonCode } from "./types";

export type { ReasonCode };

export interface ExplainInput {
  roomLabel: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  reasonCode: ReasonCode;
}

export interface ExplainResult {
  explanation: string;
}

/** Simulated failure mode — defaults to "none" (happy path). */
export type ExplainMode = "none" | "timeout" | "api_error";

const MAX_INPUT_LEN = 200;

const VALID_REASON_CODES: ReadonlySet<ReasonCode> = new Set([
  "available",
  "overlap",
  "blocked",
  "invalid_time",
  "past_time",
  "duration_exceeded",
]);

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function validateInput(input: unknown): input is ExplainInput {
  if (typeof input !== "object" || input === null) return false;
  const obj = input as Record<string, unknown>;
  if (!isString(obj.roomLabel) || obj.roomLabel.trim().length === 0) return false;
  if (!isString(obj.startTime) || obj.startTime.trim().length === 0) return false;
  if (!isString(obj.endTime) || obj.endTime.trim().length === 0) return false;
  if (typeof obj.isAvailable !== "boolean") return false;
  if (!isString(obj.reasonCode) || !VALID_REASON_CODES.has(obj.reasonCode as ReasonCode))
    return false;
  if (obj.isAvailable !== (obj.reasonCode === "available")) return false;

  const totalLen =
    obj.roomLabel.length + obj.startTime.length + obj.endTime.length;
  if (totalLen > MAX_INPUT_LEN) return false;

  return true;
}

/** Build a grounded, two-sentence-max explanation from the deterministic result. */
function buildExplanation(input: ExplainInput): string {
  const { roomLabel, startTime, endTime, isAvailable, reasonCode } = input;
  const slot = `${startTime} to ${endTime}`;

  if (isAvailable && reasonCode === "available") {
    return `${roomLabel} is free during your requested slot (${slot}). You can go ahead and use it for your study session.`;
  }

  switch (reasonCode) {
    case "overlap":
      return `${roomLabel} already has another booking that overlaps ${slot}. Try picking a different time or a different room.`;
    case "blocked":
      return `${roomLabel} is currently blocked and can't be booked. Please choose another room from the list.`;
    case "invalid_time":
      return `The time you entered (${slot}) isn't valid. Make sure the start is before the end and both are in HH:MM format.`;
    case "past_time":
      return `Your requested start time (${startTime}) is already in the past. Pick a time later than the current reference clock.`;
    case "duration_exceeded":
      return `Your requested slot (${slot}) is longer than the 2-hour maximum. Shorten your booking to 120 minutes or less.`;
    default:
      return `Availability could not be confirmed for ${roomLabel} at ${slot}. Please check the official status above.`;
  }
}

const FALLBACK_MSG =
  "Sorry, I couldn't generate an explanation right now. Please rely on the official availability status above.";

const TIMEOUT_MS = 0;

/**
 * Produce an explanation for the given availability result.
 *
 * The `mode` parameter simulates failure conditions for testing:
 *   - "timeout"   → returns a timeout fallback message
 *   - "api_error" → returns an API-error fallback message
 *   - "none"      → normal path
 */
export async function explainAvailability(
  input: unknown,
  mode: ExplainMode = "none",
): Promise<ExplainResult> {
  if (mode === "timeout") {
    await new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), TIMEOUT_MS),
    );
  }

  if (mode === "api_error") {
    throw new Error("Simulated API error");
  }

  if (!validateInput(input)) {
    return { explanation: FALLBACK_MSG };
  }

  return { explanation: buildExplanation(input) };
}

/**
 * Synchronous variant for callers that don't need async. Same validation and
 * explanation logic, but cannot simulate timeout (use the async version for
 * timeout tests).
 */
export function explainAvailabilitySync(
  input: unknown,
  mode: ExplainMode = "none",
): ExplainResult {
  if (mode === "api_error") {
    throw new Error("Simulated API error");
  }
  // timeout is inherently async — treat as fallback in sync mode
  if (mode === "timeout") {
    return { explanation: FALLBACK_MSG };
  }

  if (!validateInput(input)) {
    return { explanation: FALLBACK_MSG };
  }

  return { explanation: buildExplanation(input) };
}
