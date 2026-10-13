// src/lib/format.ts
export function formatCountdown(ms: number, units: { d: string; h: string; m: string }): string {
  const totalMin = Math.max(1, Math.ceil(ms / 60_000));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}${units.d} ${h}${units.h}`;
  if (h > 0) return `${h}${units.h} ${m}${units.m}`;
  return `${m}${units.m}`;
}
