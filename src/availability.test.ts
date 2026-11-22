import { describe, it, expect } from "vitest";
import {
  checkAvailability,
  parseTimeToMinutes,
  durationMinutes,
} from "./availability";
import {
  filterByCapacity,
  filterByEquipment,
  excludeBlocked,
  filterRooms,
} from "./filtering";
import { ROOMS, FIXED_NOW } from "./fixtures";
import type { Booking, Room } from "./types";

const ROOM: Room = ROOMS[0];
const BLOCKED_ROOM: Room = ROOMS.find((r) => r.isBlocked)!;

function makeRoom(bookings: Booking[], isBlocked = false): Room {
  return {
    id: "test-room",
    name: "Test Room",
    building: "Test Building",
    capacity: 10,
    equipment: [],
    isBlocked,
    bookings,
  };
}

function makeRoomFull(
  id: string,
  capacity: number,
  equipment: string[],
  isBlocked: boolean,
  bookings: Booking[] = [],
): Room {
  return { id, name: `Room ${id}`, building: "B", capacity, equipment, isBlocked, bookings };
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

describe("parseTimeToMinutes", () => {
  it("converts HH:MM to minutes since midnight", () => {
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(parseTimeToMinutes("09:30")).toBe(570);
    expect(parseTimeToMinutes("20:00")).toBe(1200);
  });
});

describe("durationMinutes", () => {
  it("computes the difference in minutes", () => {
    expect(durationMinutes("10:00", "11:00")).toBe(60);
    expect(durationMinutes("10:00", "10:30")).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// AC1 — reject start >= end and past times
// ---------------------------------------------------------------------------

describe("AC1 — reject start >= end", () => {
  it("rejects start equal to end", () => {
    const r = checkAvailability(ROOM, "10:00", "10:00");
    expect(r.status).toBe("invalid");
    expect(r.message).toMatch(/earlier than end time/);
  });

  it("rejects start after end", () => {
    const r = checkAvailability(ROOM, "11:00", "10:00");
    expect(r.status).toBe("invalid");
    expect(r.message).toMatch(/earlier than end time/);
  });
});

describe("AC1 — reject past time", () => {
  it("rejects a start before the fixed now", () => {
    const r = checkAvailability(ROOM, "08:00", "09:00", FIXED_NOW);
    expect(r.status).toBe("invalid");
    expect(r.message).toMatch(/past/);
    expect(r.message).toContain(FIXED_NOW);
  });

  it("accepts a start exactly at the fixed now", () => {
    const r = checkAvailability(ROOM, "09:30", "10:00", FIXED_NOW);
    expect(r.status).toBe("unavailable");
  });
});

// ---------------------------------------------------------------------------
// AC2 — reject duration > 120 minutes
// ---------------------------------------------------------------------------

describe("AC2 — reject duration > 120 minutes", () => {
  it("rejects a 121-minute booking", () => {
    const r = checkAvailability(ROOM, "12:30", "14:31", FIXED_NOW);
    expect(r.status).toBe("invalid");
    expect(r.message).toMatch(/120/);
  });

  it("rejects a 180-minute booking", () => {
    const r = checkAvailability(ROOM, "15:00", "18:00", FIXED_NOW);
    expect(r.status).toBe("invalid");
    expect(r.message).toMatch(/120/);
  });

  it("accepts exactly 120 minutes when no conflict", () => {
    const room = makeRoom([]);
    const r = checkAvailability(room, "10:00", "12:00", FIXED_NOW);
    expect(r.status).toBe("available");
  });

  it("accepts 119 minutes when no conflict", () => {
    const room = makeRoom([]);
    const r = checkAvailability(room, "10:00", "11:59", FIXED_NOW);
    expect(r.status).toBe("available");
  });
});

// ---------------------------------------------------------------------------
// AC3 — reject blocked rooms and overlapping bookings
// ---------------------------------------------------------------------------

describe("AC3 — reject blocked room (isBlocked)", () => {
  it("rejects any request on a blocked room", () => {
    const r = checkAvailability(BLOCKED_ROOM, "14:00", "15:00", FIXED_NOW);
    expect(r.status).toBe("unavailable");
    expect(r.message).toMatch(/blocked/i);
  });

  it("rejects a blocked room even with no time conflicts", () => {
    const room = makeRoom([], true);
    const r = checkAvailability(room, "10:00", "11:00", FIXED_NOW);
    expect(r.status).toBe("unavailable");
    expect(r.message).toMatch(/blocked/i);
  });
});

describe("AC3 — reject overlapping bookings", () => {
  it("rejects a request fully inside an existing booking", () => {
    const r = checkAvailability(ROOM, "08:45", "09:15", "08:00");
    expect(r.status).toBe("unavailable");
    expect(r.conflicts).toBeDefined();
    expect(r.conflicts!.length).toBe(1);
    expect(r.conflicts![0].id).toBe("b1-1");
  });

  it("rejects a request that fully contains an existing booking", () => {
    const r = checkAvailability(ROOM, "13:30", "15:30", FIXED_NOW);
    expect(r.status).toBe("unavailable");
    expect(r.conflicts![0].id).toBe("b1-3");
  });

  it("lists all conflicting bookings", () => {
    const room = makeRoom([
      { id: "x1", title: "A", organizer: "O", start: "10:00", end: "11:00" },
      { id: "x2", title: "B", organizer: "O", start: "10:30", end: "11:30" },
    ]);
    const r = checkAvailability(room, "10:15", "11:15", FIXED_NOW);
    expect(r.status).toBe("unavailable");
    expect(r.conflicts!.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// AC4 — reject overlaps but allow touching endpoints
// ---------------------------------------------------------------------------

describe("AC4 — reject overlaps but allow touching endpoints", () => {
  it("rejects a partial overlap at the start", () => {
    const r = checkAvailability(ROOM, "09:00", "10:30", "08:00");
    expect(r.status).toBe("unavailable");
    expect(r.conflicts![0].id).toBe("b1-1");
  });

  it("rejects a partial overlap at the end", () => {
    const r = checkAvailability(ROOM, "12:00", "13:00", FIXED_NOW);
    expect(r.status).toBe("unavailable");
    expect(r.conflicts![0].id).toBe("b1-2");
  });

  it("allows touching endpoint: request ends when booking starts (10:00-11:00 then 11:00-12:00)", () => {
    const room = makeRoom([
      { id: "t1", title: "First", organizer: "O", start: "11:00", end: "12:00" },
    ]);
    const r = checkAvailability(room, "10:00", "11:00", FIXED_NOW);
    expect(r.status).toBe("available");
  });

  it("allows touching endpoint: request starts when booking ends", () => {
    const room = makeRoom([
      { id: "t2", title: "First", organizer: "O", start: "10:00", end: "11:00" },
    ]);
    const r = checkAvailability(room, "11:00", "12:00", FIXED_NOW);
    expect(r.status).toBe("available");
  });

  it("allows touching the real fixture booking b1-1 end (10:00) as a start", () => {
    const r = checkAvailability(ROOM, "10:00", "11:00", FIXED_NOW);
    expect(r.status).toBe("available");
  });

  it("allows touching the real fixture booking b1-2 start (11:00) as an end", () => {
    const r = checkAvailability(ROOM, "10:00", "11:00", FIXED_NOW);
    expect(r.status).toBe("available");
  });

  it("allows a request between two adjacent fixture bookings (10:00-11:00 gap between b1-1 and b1-2)", () => {
    // b1-1 ends at 10:00, b1-2 starts at 11:00 — slot 10:00-11:00 touches both
    const r = checkAvailability(ROOM, "10:00", "11:00", FIXED_NOW);
    expect(r.status).toBe("available");
  });
});

// ---------------------------------------------------------------------------
// AC5 — do not mutate fixtures
// ---------------------------------------------------------------------------

describe("AC5 — do not mutate fixtures", () => {
  it("checkAvailability does not mutate room bookings", () => {
    const before = ROOM.bookings.map((b) => ({ ...b }));
    checkAvailability(ROOM, "09:00", "12:00", FIXED_NOW);
    const after = ROOM.bookings.map((b) => ({ ...b }));
    expect(after).toEqual(before);
  });

  it("the ROOMS fixture array is frozen", () => {
    expect(Object.isFrozen(ROOMS)).toBe(true);
    expect(Object.isFrozen(ROOMS[0])).toBe(true);
    expect(Object.isFrozen(ROOMS[0].bookings)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC6 — responsive UI feedback (result shape)
// ---------------------------------------------------------------------------

describe("AC6 — responsive UI feedback (result shape)", () => {
  it("returns a message on available", () => {
    const r = checkAvailability(ROOM, "10:00", "11:00", FIXED_NOW);
    expect(r.status).toBe("available");
    expect(r.message.length).toBeGreaterThan(0);
  });

  it("returns a message and conflicts on unavailable", () => {
    const r = checkAvailability(ROOM, "08:45", "09:15", "08:00");
    expect(r.status).toBe("unavailable");
    expect(r.message.length).toBeGreaterThan(0);
    expect(r.conflicts).toBeDefined();
  });

  it("returns a message on invalid", () => {
    const r = checkAvailability(ROOM, "11:00", "10:00", FIXED_NOW);
    expect(r.status).toBe("invalid");
    expect(r.message.length).toBeGreaterThan(0);
  });
});

describe("Invalid input format", () => {
  it("rejects malformed start time", () => {
    const r = checkAvailability(ROOM, "abc", "10:00", FIXED_NOW);
    expect(r.status).toBe("invalid");
  });

  it("rejects malformed end time", () => {
    const r = checkAvailability(ROOM, "10:00", "xyz", FIXED_NOW);
    expect(r.status).toBe("invalid");
  });
});

// ---------------------------------------------------------------------------
// R1 — reject out-of-range hours/minutes (e.g. "25:99") that pass the
// basic two-digit regex but are not valid clock times
// ---------------------------------------------------------------------------

describe("R1 — reject out-of-range time values", () => {
  it("rejects hour > 23 in start time", () => {
    const r = checkAvailability(makeRoom([]), "25:00", "26:00", FIXED_NOW);
    expect(r.status).toBe("invalid");
    expect(r.message).toMatch(/HH:MM/);
  });

  it("rejects minute > 59 in end time", () => {
    const r = checkAvailability(makeRoom([]), "10:00", "10:99", FIXED_NOW);
    expect(r.status).toBe("invalid");
    expect(r.message).toMatch(/HH:MM/);
  });

  it("rejects both start and end out of range", () => {
    const r = checkAvailability(makeRoom([]), "24:60", "25:99", FIXED_NOW);
    expect(r.status).toBe("invalid");
  });

  it("still accepts boundary-valid times 23:59", () => {
    const room = makeRoom([]);
    const r = checkAvailability(room, "23:00", "23:59", "23:00");
    expect(r.status).toBe("available");
  });
});

// ---------------------------------------------------------------------------
// R2 — reject invalid "now" format so NaN comparisons don't silently bypass
// the past-time guard (AC1)
// ---------------------------------------------------------------------------

describe("R2 — reject invalid now format", () => {
  it("rejects non-HH:MM now value", () => {
    const r = checkAvailability(makeRoom([]), "10:00", "11:00", "garbage");
    expect(r.status).toBe("invalid");
    expect(r.message).toMatch(/reference time/i);
  });

  it("rejects out-of-range now (25:99)", () => {
    const r = checkAvailability(makeRoom([]), "10:00", "11:00", "25:99");
    expect(r.status).toBe("invalid");
    expect(r.message).toMatch(/reference time/i);
  });

  it("rejects empty string now", () => {
    const r = checkAvailability(makeRoom([]), "10:00", "11:00", "");
    expect(r.status).toBe("invalid");
  });

  it("does not silently bypass past-time check when now is NaN", () => {
    // Before the fix, "abc" -> NaN -> startMin < NaN is false -> past check
    // skipped -> could return "available". Now it must return "invalid".
    const r = checkAvailability(makeRoom([]), "08:00", "09:00", "not-a-time");
    expect(r.status).not.toBe("available");
    expect(r.status).toBe("invalid");
  });
});

// ===========================================================================
// F1 — Filter rooms by capacity >= attendees
// ===========================================================================

describe("F1 — filterByCapacity", () => {
  it("returns rooms with capacity >= attendees", () => {
    const rooms = [
      makeRoomFull("a", 10, [], false),
      makeRoomFull("b", 20, [], false),
      makeRoomFull("c", 5, [], false),
    ];
    const result = filterByCapacity(rooms, 10);
    expect(result.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("returns all rooms when attendees <= 0", () => {
    const rooms = [
      makeRoomFull("a", 1, [], false),
      makeRoomFull("b", 100, [], false),
    ];
    expect(filterByCapacity(rooms, 0).length).toBe(2);
  });

  it("returns empty when no room is large enough", () => {
    const rooms = [makeRoomFull("a", 5, [], false)];
    expect(filterByCapacity(rooms, 50).length).toBe(0);
  });

  it("capacity boundary: room with exactly the requested capacity is included", () => {
    const rooms = [
      makeRoomFull("exact", 15, [], false),
      makeRoomFull("under", 14, [], false),
      makeRoomFull("over", 16, [], false),
    ];
    const result = filterByCapacity(rooms, 15);
    expect(result.map((r) => r.id)).toEqual(["exact", "over"]);
  });

  it("capacity boundary: against real fixtures, attendees=8 includes room-202 (cap 8) and larger", () => {
    const result = filterByCapacity(ROOMS, 8);
    // room-202 has capacity 8 (boundary), room-101 has 24, room-305 has 120
    // room-410 has 16 but is blocked — filterByCapacity does NOT exclude blocked (F3 does)
    expect(result.map((r) => r.id)).toEqual([
      "room-101",
      "room-202",
      "room-305",
      "room-410",
    ]);
  });
});

// ===========================================================================
// F2 — Filter rooms containing ALL required equipment
// ===========================================================================

describe("F2 — filterByEquipment", () => {
  it("returns rooms containing ALL required equipment", () => {
    const rooms = [
      makeRoomFull("a", 10, ["Projector", "Whiteboard"], false),
      makeRoomFull("b", 10, ["Projector"], false),
      makeRoomFull("c", 10, ["Projector", "Whiteboard", "Microphone"], false),
    ];
    const result = filterByEquipment(rooms, ["Projector", "Whiteboard"]);
    expect(result.map((r) => r.id)).toEqual(["a", "c"]);
  });

  it("returns all rooms when no equipment required", () => {
    const rooms = [makeRoomFull("a", 10, [], false)];
    expect(filterByEquipment(rooms, []).length).toBe(1);
  });

  it("returns empty when no room has all equipment", () => {
    const rooms = [makeRoomFull("a", 10, ["Projector"], false)];
    expect(
      filterByEquipment(rooms, ["Projector", "Microphone"]).length,
    ).toBe(0);
  });

  it("equipment boundary: room with exactly the required set is included", () => {
    const rooms = [
      makeRoomFull("exact", 10, ["Projector", "Whiteboard"], false),
      makeRoomFull("superset", 10, ["Projector", "Whiteboard", "Microphone"], false),
      makeRoomFull("partial", 10, ["Projector"], false),
    ];
    const result = filterByEquipment(rooms, ["Projector", "Whiteboard"]);
    expect(result.map((r) => r.id)).toEqual(["exact", "superset"]);
  });

  it("equipment filtering: single required item matches any room that has it", () => {
    const rooms = [
      makeRoomFull("a", 10, ["Projector"], false),
      makeRoomFull("b", 10, ["Whiteboard"], false),
      makeRoomFull("c", 10, [], false),
    ];
    const result = filterByEquipment(rooms, ["Projector"]);
    expect(result.map((r) => r.id)).toEqual(["a"]);
  });
});

// ===========================================================================
// F3 — Exclude blocked rooms
// ===========================================================================

describe("F3 — excludeBlocked", () => {
  it("excludes blocked rooms", () => {
    const rooms = [
      makeRoomFull("a", 10, [], false),
      makeRoomFull("b", 10, [], true),
      makeRoomFull("c", 10, [], false),
    ];
    const result = excludeBlocked(rooms);
    expect(result.map((r) => r.id)).toEqual(["a", "c"]);
  });

  it("returns empty when all rooms are blocked", () => {
    const rooms = [
      makeRoomFull("a", 10, [], true),
      makeRoomFull("b", 10, [], true),
    ];
    expect(excludeBlocked(rooms).length).toBe(0);
  });

  it("blocked exclusion: against real fixtures, only room-410 is removed", () => {
    const result = excludeBlocked(ROOMS);
    expect(result.map((r) => r.id)).toEqual([
      "room-101",
      "room-202",
      "room-305",
    ]);
  });
});

// ===========================================================================
// F4 — Empty state when no rooms match
// ===========================================================================

describe("F4 — empty state when no rooms match", () => {
  it("combined pipeline returns empty when capacity exceeds all rooms", () => {
    const result = filterRooms(ROOMS, 200, []);
    expect(result.length).toBe(0);
  });

  it("combined pipeline returns empty when equipment is not found in any room", () => {
    const result = filterRooms(ROOMS, 1, ["Nonexistent Equipment"]);
    expect(result.length).toBe(0);
  });

  it("combined pipeline returns empty when only matching room is blocked", () => {
    // room-410 has Projector+Whiteboard but is blocked
    const result = filterRooms(ROOMS, 1, ["Projector", "Whiteboard", "Drawing Tablets"]);
    expect(result.length).toBe(0);
  });
});

// ===========================================================================
// F5 — Switching room refreshes availability against that room's bookings
// ===========================================================================

describe("F5 — room-specific availability", () => {
  it("checkAvailability returns different results for different rooms with the same time slot", () => {
    const room101 = ROOMS.find((r) => r.id === "room-101")!;
    const room202 = ROOMS.find((r) => r.id === "room-202")!;

    // 09:30-10:00 overlaps b1-1 in room-101 (08:30-10:00) -> unavailable
    const r101 = checkAvailability(room101, "09:30", "10:00", FIXED_NOW);
    expect(r101.status).toBe("unavailable");

    // 09:30-10:00 overlaps b2-1 in room-202 (09:00-10:30) -> also unavailable
    // but the conflict is a different booking, proving room-specific checking
    const r202 = checkAvailability(room202, "09:30", "10:00", FIXED_NOW);
    expect(r202.status).toBe("unavailable");
    expect(r202.conflicts![0].id).toBe("b2-1");
    expect(r101.conflicts![0].id).toBe("b1-1");
  });

  it("a time slot available in one room may be unavailable in another", () => {
    const room101 = ROOMS.find((r) => r.id === "room-101")!;
    const room202 = ROOMS.find((r) => r.id === "room-202")!;

    // 10:00-10:30 in room-101: b1-1 ends at 10:00, b1-2 starts at 11:00 -> available
    const r101 = checkAvailability(room101, "10:00", "10:30", FIXED_NOW);
    expect(r101.status).toBe("available");

    // 10:00-10:30 in room-202: b2-1 is 09:00-10:30 -> overlaps -> unavailable
    const r202 = checkAvailability(room202, "10:00", "10:30", FIXED_NOW);
    expect(r202.status).toBe("unavailable");
  });

  it("selecting the auditorium (room-305) checks against its own bookings", () => {
    const auditorium = ROOMS.find((r) => r.id === "room-305")!;
    // 10:00-11:00 overlaps b3-1 (10:00-11:30) -> unavailable
    const r = checkAvailability(auditorium, "10:00", "11:00", FIXED_NOW);
    expect(r.status).toBe("unavailable");
    expect(r.conflicts![0].id).toBe("b3-1");
  });
});

// ===========================================================================
// Combined pipeline — F1+F2+F3 together
// ===========================================================================

describe("Combined filterRooms pipeline (F1+F2+F3)", () => {
  it("applies capacity, equipment, and blocked filters together", () => {
    const rooms = [
      makeRoomFull("a", 30, ["Projector", "Whiteboard"], false),
      makeRoomFull("b", 30, ["Projector"], false),
      makeRoomFull("c", 5, ["Projector", "Whiteboard"], false),
      makeRoomFull("d", 30, ["Projector", "Whiteboard"], true),
    ];
    const result = filterRooms(rooms, 20, ["Projector", "Whiteboard"]);
    expect(result.map((r) => r.id)).toEqual(["a"]);
  });

  it("against real fixtures: capacity 10, no equipment, excludes blocked room-410", () => {
    const result = filterRooms(ROOMS, 10, []);
    expect(result.map((r) => r.id)).toEqual(["room-101", "room-305"]);
  });

  it("against real fixtures: capacity 1, Projector+Whiteboard, excludes blocked", () => {
    const result = filterRooms(ROOMS, 1, ["Projector", "Whiteboard"]);
    expect(result.map((r) => r.id)).toEqual(["room-101"]);
  });

  it("does not mutate input rooms array", () => {
    const rooms = [
      makeRoomFull("a", 10, [], false),
      makeRoomFull("b", 5, [], false),
    ];
    const original = [...rooms];
    filterRooms(rooms, 8, []);
    expect(rooms).toEqual(original);
  });
});

// ===========================================================================
// EA1 — reasonCode regression: every checkAvailability outcome sets the
// correct deterministic reasonCode on AvailabilityResult
// ===========================================================================

describe("EA1 — reasonCode on AvailabilityResult", () => {
  it("available result has reasonCode 'available'", () => {
    const room = makeRoom([]);
    const r = checkAvailability(room, "10:00", "11:00", FIXED_NOW);
    expect(r.status).toBe("available");
    expect(r.reasonCode).toBe("available");
  });

  it("overlap result has reasonCode 'overlap'", () => {
    const room = makeRoom([
      { id: "c1", title: "A", organizer: "O", start: "10:00", end: "11:00" },
    ]);
    const r = checkAvailability(room, "10:15", "10:45", FIXED_NOW);
    expect(r.status).toBe("unavailable");
    expect(r.reasonCode).toBe("overlap");
  });

  it("blocked result has reasonCode 'blocked'", () => {
    const r = checkAvailability(BLOCKED_ROOM, "14:00", "15:00", FIXED_NOW);
    expect(r.status).toBe("unavailable");
    expect(r.reasonCode).toBe("blocked");
  });

  it("past-time result has reasonCode 'past_time'", () => {
    const r = checkAvailability(ROOM, "08:00", "09:00", FIXED_NOW);
    expect(r.status).toBe("invalid");
    expect(r.reasonCode).toBe("past_time");
  });

  it("duration-exceeded result has reasonCode 'duration_exceeded'", () => {
    const r = checkAvailability(makeRoom([]), "12:30", "14:31", FIXED_NOW);
    expect(r.status).toBe("invalid");
    expect(r.reasonCode).toBe("duration_exceeded");
  });

  it("start >= end result has reasonCode 'invalid_time'", () => {
    const r = checkAvailability(ROOM, "11:00", "10:00", FIXED_NOW);
    expect(r.status).toBe("invalid");
    expect(r.reasonCode).toBe("invalid_time");
  });

  it("malformed time result has reasonCode 'invalid_time'", () => {
    const r = checkAvailability(ROOM, "abc", "10:00", FIXED_NOW);
    expect(r.status).toBe("invalid");
    expect(r.reasonCode).toBe("invalid_time");
  });
});
