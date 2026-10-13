import { REGIONS, type RegionId } from "./regions";

export type ResetPeriod = "day" | "week";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export function lastResetAt(now: Date, region: RegionId, period: ResetPeriod): Date {
  const { offsetMin, resetHour, weeklyDay } = REGIONS[region];
  // Shift so every reset instant lands on a multiple of DAY.
  const shift = offsetMin * 60_000 - resetHour * HOUR;
  let start = Math.floor((now.getTime() + shift) / DAY) * DAY;
  if (period === "week") {
    const weekday = new Date(start).getUTCDay(); // server-local weekday of that reset
    start -= ((weekday - weeklyDay + 7) % 7) * DAY;
  }
  return new Date(start - shift);
}

export function nextResetAt(now: Date, region: RegionId, period: ResetPeriod): Date {
  return new Date(lastResetAt(now, region, period).getTime() + (period === "day" ? DAY : 7 * DAY));
}
