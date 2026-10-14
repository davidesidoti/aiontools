export const REGION_IDS = ["global", "kr", "tw"] as const;
export type RegionId = (typeof REGION_IDS)[number];

// shortcut: fixed UTC offsets — valid because none of these server clocks observe DST; switch to a tz library if a DST region is added.
export const REGIONS: Record<RegionId, { offsetMin: number; resetHour: number; weeklyDay: number }> = {
  global: { offsetMin: 0, resetHour: 7, weeklyDay: 3 }, // Wednesday
  kr: { offsetMin: 9 * 60, resetHour: 5, weeklyDay: 3 },
  tw: { offsetMin: 8 * 60, resetHour: 5, weeklyDay: 3 },
};

// Global has separate servers whose events follow their local clock; KR and TW have one each.
export const SERVER_IDS = ["eu", "na-east", "na-west"] as const;
export type ServerId = (typeof SERVER_IDS)[number];

const EVENT_TZ: Record<ServerId | Exclude<RegionId, "global">, string> = {
  eu: "Europe/Berlin",
  "na-east": "America/New_York",
  "na-west": "America/Los_Angeles",
  kr: "Asia/Seoul",
  tw: "Asia/Taipei",
};

export function eventTimeZone(region: RegionId, server: ServerId): string {
  return EVENT_TZ[region === "global" ? server : region];
}
