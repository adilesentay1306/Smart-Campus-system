import type { Booking, Room } from "./types";
import { FIXED_NOW, MAX_DURATION_MINUTES } from "./config";

export { FIXED_NOW, MAX_DURATION_MINUTES };

export const ROOMS: readonly Room[] = Object.freeze([
  Object.freeze({
    id: "room-101",
    name: "Innovation Lab",
    building: "Engineering Block B",
    capacity: 24,
    equipment: Object.freeze([
      "Projector",
      "Whiteboard",
      "Video Conferencing",
      "3D Printer",
    ]) as readonly string[],
    isBlocked: false,
    bookings: Object.freeze([
      {
        id: "b1-1",
        title: "Embedded Systems Workshop",
        organizer: "Dr. Patel",
        start: "08:30",
        end: "10:00",
      },
      {
        id: "b1-2",
        title: "Robotics Demo Prep",
        organizer: "ACM Chapter",
        start: "11:00",
        end: "12:30",
      },
      {
        id: "b1-3",
        title: "Faculty Meeting",
        organizer: "Dean's Office",
        start: "14:00",
        end: "15:00",
      },
      {
        id: "b1-4",
        title: "Open Project Night",
        organizer: "Hack Club",
        start: "16:30",
        end: "18:00",
      },
    ]) as readonly Booking[],
  }) as Room,

  Object.freeze({
    id: "room-202",
    name: "Think Tank",
    building: "Business School A",
    capacity: 8,
    equipment: Object.freeze([
      "Whiteboard",
      "Video Conferencing",
    ]) as readonly string[],
    isBlocked: false,
    bookings: Object.freeze([
      {
        id: "b2-1",
        title: "Strategy Review",
        organizer: "Prof. Nguyen",
        start: "09:00",
        end: "10:30",
      },
      {
        id: "b2-2",
        title: "Case Study Group",
        organizer: "MBA Cohort",
        start: "13:00",
        end: "14:00",
      },
    ]) as readonly Booking[],
  }) as Room,

  Object.freeze({
    id: "room-305",
    name: "Auditorium",
    building: "Main Hall",
    capacity: 120,
    equipment: Object.freeze([
      "Projector",
      "Microphone",
      "Stage Lighting",
    ]) as readonly string[],
    isBlocked: false,
    bookings: Object.freeze([
      {
        id: "b3-1",
        title: "Guest Lecture: AI Ethics",
        organizer: "CS Department",
        start: "10:00",
        end: "11:30",
      },
      {
        id: "b3-2",
        title: "Career Fair Setup",
        organizer: "Career Services",
        start: "15:00",
        end: "17:00",
      },
    ]) as readonly Booking[],
  }) as Room,

  Object.freeze({
    id: "room-410",
    name: "Design Studio",
    building: "Arts Wing C",
    capacity: 16,
    equipment: Object.freeze([
      "Projector",
      "Whiteboard",
      "Drawing Tablets",
    ]) as readonly string[],
    isBlocked: true,
    bookings: Object.freeze([
      {
        id: "b4-1",
        title: "Portfolio Review",
        organizer: "Prof. Lee",
        start: "09:00",
        end: "12:00",
      },
    ]) as readonly Booking[],
  }) as Room,
]) as readonly Room[];
