import { useMemo } from "react";
import type { Booking } from "./types";
import { parseTimeToMinutes } from "./availability";

interface Props {
  bookings: readonly Booking[];
  pendingStart: string | null;
  pendingEnd: string | null;
}

const DAY_START = 8 * 60; // 08:00
const DAY_END = 20 * 60; // 20:00
const DAY_SPAN = DAY_END - DAY_START;

function toPercent(minutes: number): number {
  return ((minutes - DAY_START) / DAY_SPAN) * 100;
}

export default function Timeline({
  bookings,
  pendingStart,
  pendingEnd,
}: Props) {
  const hourMarks = useMemo(() => {
    const marks = [];
    for (let h = 8; h <= 20; h++) marks.push(h * 60);
    return marks;
  }, []);

  const pending = useMemo(() => {
    if (!pendingStart || !pendingEnd) return null;
    if (!/^\d{2}:\d{2}$/.test(pendingStart) || !/^\d{2}:\d{2}$/.test(pendingEnd))
      return null;
    const s = parseTimeToMinutes(pendingStart);
    const e = parseTimeToMinutes(pendingEnd);
    if (s >= e) return null;
    return { s, e };
  }, [pendingStart, pendingEnd]);

  return (
    <div className="w-full">
      <div className="relative h-28 w-full select-none rounded-xl bg-slate-800/40 ring-1 ring-slate-700/50">
        {/* Hour grid lines */}
        {hourMarks.map((m) => (
          <div
            key={m}
            className="absolute top-0 bottom-0 border-l border-slate-700/40"
            style={{ left: `${toPercent(m)}%` }}
          >
            <span className="absolute -top-0.5 left-1 text-[10px] font-medium text-slate-500">
              {String(Math.floor(m / 60)).padStart(2, "0")}:00
            </span>
          </div>
        ))}

        {/* Existing bookings */}
        {bookings.map((b) => {
          const s = parseTimeToMinutes(b.start);
          const e = parseTimeToMinutes(b.end);
          return (
            <div
              key={b.id}
              className="group absolute top-6 bottom-3 rounded-md bg-rose-500/25 ring-1 ring-rose-400/40 transition-colors hover:bg-rose-500/40"
              style={{
                left: `${toPercent(s)}%`,
                width: `${toPercent(e) - toPercent(s)}%`,
              }}
            >
              <div className="truncate px-2 py-1 text-[10px] font-medium text-rose-200">
                {b.start}–{b.end}
              </div>
              <div className="hidden truncate px-2 text-[10px] text-rose-300/80 group-hover:block">
                {b.title}
              </div>
            </div>
          );
        })}

        {/* Pending request window */}
        {pending && (
          <div
            className="absolute top-6 bottom-3 rounded-md border-2 border-dashed border-emerald-400/70 bg-emerald-400/15"
            style={{
              left: `${toPercent(pending.s)}%`,
              width: `${toPercent(pending.e) - toPercent(pending.s)}%`,
            }}
          >
            <div className="truncate px-2 py-1 text-[10px] font-semibold text-emerald-200">
              Request
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
