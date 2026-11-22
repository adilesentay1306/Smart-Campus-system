import type { Room } from "./types";

/**
 * F1: Filter rooms where capacity >= requested attendees.
 */
export function filterByCapacity(
  rooms: readonly Room[],
  attendees: number,
): readonly Room[] {
  if (attendees <= 0) return rooms;
  return rooms.filter((r) => r.capacity >= attendees);
}

/**
 * F2: Filter rooms containing ALL selected required equipment.
 */
export function filterByEquipment(
  rooms: readonly Room[],
  required: readonly string[],
): readonly Room[] {
  if (required.length === 0) return rooms;
  return rooms.filter((r) =>
    required.every((item) => r.equipment.includes(item)),
  );
}

/**
 * F3: Exclude blocked rooms from available status.
 */
export function excludeBlocked(
  rooms: readonly Room[],
): readonly Room[] {
  return rooms.filter((r) => !r.isBlocked);
}

/**
 * Combined filter pipeline: F1 -> F2 -> F3.
 * Applied in order so blocked rooms are always excluded last.
 */
export function filterRooms(
  rooms: readonly Room[],
  attendees: number,
  requiredEquipment: readonly string[],
): readonly Room[] {
  return excludeBlocked(
    filterByEquipment(
      filterByCapacity(rooms, attendees),
      requiredEquipment,
    ),
  );
}
