import { useMemo, useState, useEffect } from "react";
import {
  CalendarCheck,
  Clock,
  DoorOpen,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  RotateCcw,
  Monitor,
  SearchX,
  MonitorCog,
  Sparkles,
  Loader2,
} from "lucide-react";
import { ROOMS, FIXED_NOW, MAX_DURATION_MINUTES } from "./fixtures";
import { checkAvailability, durationMinutes } from "./availability";
import { filterRooms } from "./filtering";
import type { AvailabilityResult } from "./types";
import { explainAvailability, type ExplainInput } from "./explainAdapter";
import Timeline from "./Timeline";

const TIME_OPTIONS: string[] = (() => {
  const opts: string[] = [];
  for (let h = 8; h <= 20; h++) {
    for (const m of [0, 30])
      opts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return opts;
})();

const ALL_EQUIPMENT: string[] = (() => {
  const set = new Set<string>();
  ROOMS.forEach((r) => r.equipment.forEach((e) => set.add(e)));
  return Array.from(set).sort();
})();

export default function App() {
  const [attendees, setAttendees] = useState(1);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(ROOMS[0].id);
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("11:00");
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);

  // Combined filter pipeline — F1 (capacity) + F2 (equipment) + F3 (blocked)
  const filteredRooms = useMemo(
    () => filterRooms(ROOMS, attendees, selectedEquipment),
    [attendees, selectedEquipment],
  );

  // F5: when the selected room is no longer in the filtered list, clear selection
  useEffect(() => {
    if (!filteredRooms.some((r) => r.id === selectedRoomId)) {
      setSelectedRoomId(filteredRooms[0]?.id ?? "");
    }
  }, [filteredRooms, selectedRoomId]);

  const selectedRoom = useMemo(
    () => ROOMS.find((r) => r.id === selectedRoomId) ?? null,
    [selectedRoomId],
  );

  // F5: switching room resets the result so availability is re-checked against the new room
  const duration = useMemo(() => {
    if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return null;
    return durationMinutes(start, end);
  }, [start, end]);

  function handleCheck() {
    if (!selectedRoom) return;
    setResult(checkAvailability(selectedRoom, start, end));
    setExplanation(null);
  }

  async function handleExplain() {
    if (!result || !selectedRoom) return;
    setExplainLoading(true);
    setExplanation(null);
    const input: ExplainInput = {
      roomLabel: selectedRoom.name,
      startTime: start,
      endTime: end,
      isAvailable: result.status === "available",
      reasonCode: result.reasonCode,
    };
    try {
      const res = await explainAvailability(input);
      setExplanation(res.explanation);
    } catch {
      setExplanation(
        "Sorry, I couldn't generate an explanation right now. Please rely on the official availability status above.",
      );
    } finally {
      setExplainLoading(false);
    }
  }

  function handleReset() {
    setAttendees(1);
    setSelectedEquipment([]);
    setStart("10:00");
    setEnd("11:00");
    setResult(null);
    setExplanation(null);
  }

  function toggleEquipment(item: string) {
    setSelectedEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item],
    );
    setResult(null);
    setExplanation(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        {/* Header */}
        <header className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30">
            <CalendarCheck className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Smart Campus Room Checker
            </h1>
            <p className="text-sm text-slate-400">
              Find and check available rooms across campus.
            </p>
          </div>
        </header>

        {/* Current time banner */}
        <div className="mb-6 flex items-center justify-between rounded-xl bg-slate-800/50 px-4 py-3 ring-1 ring-slate-700/50">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Clock className="h-4 w-4 text-sky-400" />
            <span>
              Reference time:{" "}
              <span className="font-semibold text-slate-100">{FIXED_NOW}</span>
            </span>
          </div>
          <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-medium text-sky-300 ring-1 ring-sky-400/20">
            Fixed clock
          </span>
        </div>

        {/* Filters section */}
        <section className="mb-6 rounded-2xl bg-slate-800/40 p-5 ring-1 ring-slate-700/50 sm:p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            <MonitorCog className="h-4 w-4" />
            Filter rooms
          </h3>

          {/* Attendees */}
          <label className="block">
            <span className="mb-1.5 block text-sm text-slate-300">
              Minimum attendees
            </span>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={120}
                value={attendees}
                onChange={(e) => {
                  setAttendees(Number(e.target.value));
                  setResult(null);
                  setExplanation(null);
                }}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-700 accent-emerald-500"
              />
              <span className="flex h-9 min-w-[3.5rem] items-center justify-center rounded-lg bg-slate-900/60 px-3 text-sm font-semibold text-emerald-300 ring-1 ring-slate-700">
                {attendees}
              </span>
            </div>
          </label>

          {/* Equipment checkboxes */}
          <div className="mt-5">
            <span className="mb-2 block text-sm text-slate-300">
              Required equipment
            </span>
            <div className="flex flex-wrap gap-2">
              {ALL_EQUIPMENT.map((item) => {
                const checked = selectedEquipment.includes(item);
                return (
                  <button
                    key={item}
                    onClick={() => toggleEquipment(item)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition active:scale-[0.97] ${
                      checked
                        ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40"
                        : "bg-slate-700/40 text-slate-400 ring-1 ring-slate-600/40 hover:bg-slate-700/60"
                    }`}
                  >
                    {checked && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtered room count */}
          <div className="mt-4 text-xs text-slate-500">
            {filteredRooms.length} room{filteredRooms.length !== 1 ? "s" : ""} match
          </div>
        </section>

        {/* F4: Empty state */}
        {filteredRooms.length === 0 ? (
          <section className="mb-6 flex flex-col items-center justify-center rounded-2xl bg-slate-800/30 p-12 text-center ring-1 ring-slate-700/40">
            <SearchX className="mb-3 h-10 w-10 text-slate-600" />
            <p className="text-sm font-medium text-slate-400">
              No rooms match your filters
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Try lowering the attendee count or removing equipment requirements.
            </p>
          </section>
        ) : (
          <>
            {/* Room selector */}
            <section className="mb-6 rounded-2xl bg-slate-800/40 p-5 ring-1 ring-slate-700/50 sm:p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Select a room
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {filteredRooms.map((room) => {
                  const isSelected = room.id === selectedRoomId;
                  return (
                    <button
                      key={room.id}
                      onClick={() => {
                        setSelectedRoomId(room.id);
                        setResult(null);
                        setExplanation(null);
                      }}
                      className={`rounded-xl p-4 text-left transition active:scale-[0.98] ${
                        isSelected
                          ? "bg-emerald-500/15 ring-2 ring-emerald-400/50"
                          : "bg-slate-900/40 ring-1 ring-slate-700/50 hover:bg-slate-900/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-medium text-slate-100">
                          <DoorOpen className="h-4 w-4 text-emerald-400" />
                          {room.name}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Users className="h-3.5 w-3.5" />
                          {room.capacity}
                        </span>
                      </div>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <Building2 className="h-3.5 w-3.5" />
                        {room.building}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {room.equipment.map((e) => (
                          <span
                            key={e}
                            className="rounded-md bg-slate-700/40 px-2 py-0.5 text-[10px] text-slate-400"
                          >
                            {e}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Selected room detail + timeline */}
            {selectedRoom && (
              <section className="mb-6 rounded-2xl bg-slate-800/40 p-5 ring-1 ring-slate-700/50 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <DoorOpen className="h-5 w-5 text-emerald-400" />
                      <h2 className="text-lg font-semibold">
                        {selectedRoom.name}
                      </h2>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
                      <Building2 className="h-4 w-4" />
                      {selectedRoom.building}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg bg-slate-700/40 px-3 py-1.5 text-sm text-slate-300">
                    <Users className="h-4 w-4 text-slate-400" />
                    {selectedRoom.capacity} seats
                  </div>
                </div>

                {/* Equipment badges */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selectedRoom.equipment.map((e) => (
                    <span
                      key={e}
                      className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-1 text-[11px] font-medium text-sky-300 ring-1 ring-sky-400/20"
                    >
                      <Monitor className="h-3 w-3" />
                      {e}
                    </span>
                  ))}
                </div>

                {/* Timeline */}
                <div className="mt-6">
                  <Timeline
                    bookings={selectedRoom.bookings}
                    pendingStart={start}
                    pendingEnd={end}
                  />
                  <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-rose-500/40 ring-1 ring-rose-400/40" />
                      Booked
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm border-2 border-dashed border-emerald-400/70 bg-emerald-400/15" />
                      Your request
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* Booking form */}
            <section className="rounded-2xl bg-slate-800/40 p-5 ring-1 ring-slate-700/50 sm:p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Request a time slot
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm text-slate-300">
                    Start time
                  </span>
                  <select
                    value={start}
                    onChange={(e) => {
                      setStart(e.target.value);
                      setResult(null);
                      setExplanation(null);
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm text-slate-300">
                    End time
                  </span>
                  <select
                    value={end}
                    onChange={(e) => {
                      setEnd(e.target.value);
                      setResult(null);
                      setExplanation(null);
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Duration hint */}
              {duration !== null && (
                <div className="mt-3 flex items-center gap-2 text-xs">
                  {duration <= 0 ? (
                    <span className="text-amber-400">
                      End must be after start.
                    </span>
                  ) : duration > MAX_DURATION_MINUTES ? (
                    <span className="text-amber-400">
                      Duration {duration} min exceeds the{" "}
                      {MAX_DURATION_MINUTES}-minute limit.
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      Duration: {duration} minutes
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={handleCheck}
                  disabled={!selectedRoom}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CalendarCheck className="h-4 w-4" />
                  Check availability
                </button>
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-700/60 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-700 active:scale-[0.98]"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>

              {/* Result feedback */}
              {result && (
                <div
                  className={`mt-5 rounded-xl p-4 ring-1 transition ${
                    result.status === "available"
                      ? "bg-emerald-500/10 ring-emerald-400/30"
                      : result.status === "unavailable"
                        ? "bg-rose-500/10 ring-rose-400/30"
                        : "bg-amber-500/10 ring-amber-400/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.status === "available" && (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                    )}
                    {result.status === "unavailable" && (
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                    )}
                    {result.status === "invalid" && (
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                    )}
                    <div className="text-sm">
                      <p
                        className={`font-medium ${
                          result.status === "available"
                            ? "text-emerald-200"
                            : result.status === "unavailable"
                              ? "text-rose-200"
                              : "text-amber-200"
                        }`}
                      >
                        {result.message}
                      </p>

                      {result.conflicts &&
                        result.conflicts.length > 0 && (
                          <ul className="mt-3 space-y-1.5">
                            {result.conflicts.map((c) => (
                              <li
                                key={c.id}
                                className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-rose-200/90"
                              >
                                <span className="font-semibold text-rose-300">
                                  {c.start}–{c.end}
                                </span>
                                <span className="text-rose-200/70">·</span>
                                <span>{c.title}</span>
                                <span className="text-rose-200/70">·</span>
                                <span className="text-rose-200/60">
                                  {c.organizer}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                    </div>
                  </div>

                  {/* Explain availability button — AI-generated, separate from official status */}
                  <div className="mt-4 border-t border-slate-700/50 pt-4">
                    <button
                      onClick={handleExplain}
                      disabled={explainLoading}
                      className="inline-flex items-center gap-2 rounded-lg bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-300 ring-1 ring-sky-400/30 transition hover:bg-sky-500/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {explainLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Explain availability
                    </button>

                    {explanation && (
                      <div className="mt-3 rounded-lg bg-sky-500/5 p-3 ring-1 ring-sky-400/15">
                        <div className="flex items-start gap-2">
                          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-400/70" />
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-sky-400/60">
                              AI-generated explanation
                            </p>
                            <p className="mt-1 text-sm text-slate-300">
                              {explanation}
                            </p>
                            <p className="mt-1.5 text-[10px] text-slate-500">
                              This is an AI summary for convenience only — the
                              official status above is authoritative.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Existing bookings list */}
            {selectedRoom && (
              <section className="mt-6 rounded-2xl bg-slate-800/40 p-5 ring-1 ring-slate-700/50 sm:p-6">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Existing bookings today — {selectedRoom.name}
                </h3>
                {selectedRoom.bookings.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No existing bookings for this room.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {selectedRoom.bookings.map((b) => (
                      <li
                        key={b.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900/40 px-4 py-2.5 text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="rounded-md bg-rose-500/15 px-2 py-1 text-xs font-semibold text-rose-300 ring-1 ring-rose-400/20">
                            {b.start}–{b.end}
                          </span>
                          <span className="font-medium text-slate-200">
                            {b.title}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {b.organizer}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        )}

        <footer className="mt-8 text-center text-xs text-slate-600">
          Bookings shown on a fixed reference clock. Touching endpoints are
          allowed.
        </footer>
      </div>
    </div>
  );
}
