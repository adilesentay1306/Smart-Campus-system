import type {
  AvailabilityResult,
  Booking,
  Room,
} from "./types";
import { FIXED_NOW, MAX_DURATION_MINUTES } from "./config";

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Strict validation: HH:MM with 00–23 hours and 00–59 minutes.
// parseTimeToMinutes itself is lenient (e.g. "25:99" -> 1599); this guard
// rejects out-of-range values before they reach business logic.
const TIME_RANGE_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isValidTime(time: string): boolean {
  return TIME_RANGE_RE.test(time);
}

export function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function durationMinutes(start: string, end: string): number {
  return parseTimeToMinutes(end) - parseTimeToMinutes(start);
}

// Overlap check: touching endpoints do NOT count as overlap.
// [a.start, a.end) and [b.start, b.end) overlap iff a.start < b.end && b.start < a.end
function overlaps(a: Booking, startMin: number, endMin: number): boolean {
  const aStart = parseTimeToMinutes(a.start);
  const aEnd = parseTimeToMinutes(a.end);
  return startMin < aEnd && aStart < endMin;
}

export function checkAvailability(
  room: Room,
  start: string,
  end: string,
  now: string = FIXED_NOW,
): AvailabilityResult {
  // AC1: reject start >= end
  if (!isValidTime(start) || !isValidTime(end)) {
    return {
      status: "invalid",
      reasonCode: "invalid_time",
      message: "Please enter both start and end times in HH:MM format.",
    };
  }

  const startMin = parseTimeToMinutes(start);
  const endMin = parseTimeToMinutes(end);

  // R2: reject invalid "now" — if now is malformed, parseTimeToMinutes
  // returns NaN and all comparisons silently pass, bypassing the past-time guard.
  if (!isValidTime(now)) {
    return {
      status: "invalid",
      reasonCode: "invalid_time",
      message: "Reference time (now) is not a valid HH:MM value.",
    };
  }
  const nowMin = parseTimeToMinutes(now);

  if (startMin >= endMin) {
    return {
      status: "invalid",
      reasonCode: "invalid_time",
      message: "Start time must be earlier than end time.",
    };
  }

  // AC1: reject past times (start before the fixed "now")
  if (startMin < nowMin) {
    return {
      status: "invalid",
      reasonCode: "past_time",
      message: `Start time cannot be in the past. Current time is ${now}.`,
    };
  }

  // AC2: reject duration > 120 minutes
  const duration = endMin - startMin;
  if (duration > MAX_DURATION_MINUTES) {
    return {
      status: "invalid",
      reasonCode: "duration_exceeded",
      message: `Booking duration cannot exceed ${MAX_DURATION_MINUTES} minutes. Your request is ${duration} minutes.`,
    };
  }

  // AC3: reject blocked rooms
  if (room.isBlocked) {
    return {
      status: "unavailable",
      reasonCode: "blocked",
      message: `${room.name} is currently blocked and unavailable for booking.`,
    };
  }

  // AC4: reject overlaps (touching endpoints allowed)
  const conflicts = room.bookings.filter((b) =>
    overlaps(b, startMin, endMin),
  );

  if (conflicts.length > 0) {
    return {
      status: "unavailable",
      reasonCode: "overlap",
      message: "This room is already booked during that time window.",
      conflicts,
    };
  }

  // AC3 / AC4 pass -> available
  return {
    status: "available",
    reasonCode: "available",
    message: `The ${room.name} is available from ${start} to ${end}.`,
  };
}
