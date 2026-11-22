export interface Booking {
  id: string;
  title: string;
  organizer: string;
  start: string; // "HH:MM" 24h
  end: string; // "HH:MM" 24h
}

export interface Room {
  id: string;
  name: string;
  building: string;
  capacity: number;
  equipment: readonly string[];
  isBlocked: boolean;
  bookings: readonly Booking[];
}

export type AvailabilityStatus = "available" | "unavailable" | "invalid";

export type ReasonCode =
  | "available"
  | "overlap"
  | "blocked"
  | "invalid_time"
  | "past_time"
  | "duration_exceeded";

export interface AvailabilityResult {
  status: AvailabilityStatus;
  reasonCode: ReasonCode;
  message: string;
  conflicts?: Booking[];
}
