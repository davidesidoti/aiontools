// src/lib/checklist.ts
import type { UserData } from "./user-data";
import { maxFor, resetPeriod, type Activity, type Section } from "./activities";
import { lastResetAt } from "./reset";

const isMainChar = (data: UserData, charId: string) => data.characters.find((c) => c.id === charId)?.isMain;

export function applyResets(data: UserData, now: Date, activities: Activity[]): UserData {
  let next = data;
  for (const period of ["day", "week"] as const) {
    const key = period === "day" ? "lastDaily" : "lastWeekly";
    const boundary = lastResetAt(now, data.settings.region, period);
    if (new Date(next.checklist[key]) >= boundary) continue;
    const ids = new Set(activities.filter((a) => resetPeriod(a) === period).map((a) => a.id));
    const progress = Object.fromEntries(
      Object.entries(next.checklist.progress).map(([charId, counts]) => [
        charId,
        Object.fromEntries(Object.entries(counts).filter(([id]) => !ids.has(id))),
      ]),
    );
    next = { ...next, checklist: { ...next.checklist, progress, [key]: boundary.toISOString() } };
  }
  return next;
}

export function getCount(data: UserData, charId: string, a: Activity): number {
  const isMain = isMainChar(data, charId);
  if (isMain === undefined) return 0;
  return Math.min(data.checklist.progress[charId]?.[a.id] ?? 0, maxFor(a, isMain));
}

export function setCount(data: UserData, charId: string, a: Activity, count: number): UserData {
  const isMain = isMainChar(data, charId);
  if (isMain === undefined) return data;
  const max = maxFor(a, isMain);
  if (max === 0) return data;
  const value = Math.min(max, Math.max(0, Math.round(count)));
  if (value === (data.checklist.progress[charId]?.[a.id] ?? 0)) return data;
  return {
    ...data,
    checklist: {
      ...data.checklist,
      progress: { ...data.checklist.progress, [charId]: { ...data.checklist.progress[charId], [a.id]: value } },
    },
  };
}

export function progressFor(data: UserData, charId: string, activities: Activity[], sections: readonly Section[]) {
  const isMain = isMainChar(data, charId) ?? false;
  let done = 0;
  let total = 0;
  for (const a of activities) {
    if (!sections.includes(a.section)) continue;
    const max = maxFor(a, isMain);
    total += max;
    done += Math.min(data.checklist.progress[charId]?.[a.id] ?? 0, max);
  }
  return { done, total };
}
