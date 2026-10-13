// src/components/checklist/activity-hints.ts
import { localize, type Activity } from "@/lib/activities";
import { guideFor } from "@/lib/guides";

export type HintT = (key: "cap" | "capSub" | "rewards" | "where", values: Record<string, string | number>) => string;

export function activityHints(a: Activity, locale: string, t: HintT): string[] {
  const g = guideFor(a);
  const lines: (string | false | undefined)[] = [
    "cap" in a.limit && (a.limit.capSub ? t("capSub", { cap: a.limit.cap, capSub: a.limit.capSub }) : t("cap", { cap: a.limit.cap })),
    a.note && localize(a.note, locale),
    g && t("rewards", { value: localize(g.rewards, locale) }),
    g && t("where", { value: localize(g.where, locale) }),
  ];
  return lines.filter((x): x is string => Boolean(x));
}
