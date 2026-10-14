// src/lib/tz.ts
// Time-zone math with Intl only: wall clock of an instant, and the instant of a wall clock.
const HOUR = 3_600_000;
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" });
    formatters.set(timeZone, f);
  }
  return f;
}

export function wallClock(instant: number, timeZone: string) {
  const parts = formatter(timeZone).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour"), mi: get("minute") };
}

function offsetAt(instant: number, timeZone: string): number {
  const w = wallClock(instant, timeZone);
  return Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi) - Math.floor(instant / 60_000) * 60_000;
}

// Repeated autumn hour → its first instance; spring-forward gap → shifted forward by the gap.
export function zonedInstant(y: number, mo: number, d: number, h: number, mi: number, timeZone: string): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const candidates = [...new Set([offsetAt(guess - 12 * HOUR, timeZone), offsetAt(guess + 12 * HOUR, timeZone)])].map((o) => guess - o);
  const exact = candidates.filter((t) => {
    const w = wallClock(t, timeZone);
    return w.d === d && w.h === h && w.mi === mi;
  });
  return exact.length > 0 ? Math.min(...exact) : Math.max(...candidates);
}
