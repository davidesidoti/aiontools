// src/components/checklist/activity-hints.test.ts
import { describe, it, expect } from "vitest";
import { activityHints } from "./activity-hints";
import { ACTIVITIES } from "@/lib/activities";
import { GUIDE_BY_ID } from "@/lib/guides";

const t = (key: string, v: Record<string, string | number>) => `${key}:${Object.values(v).join("/")}`;
const a = (id: string) => ACTIVITIES.find((x) => x.id === id)!;

describe("activityHints", () => {
  it("adds rewards and location when the activity has a guide entry", () => {
    const hints = activityHints(a("duty-missions"), "en", t);
    expect(hints).toContain(`rewards:${GUIDE_BY_ID.get("duty-missions")!.rewards.en}`);
    expect(hints).toContain(`where:${GUIDE_BY_ID.get("duty-missions")!.where.en}`);
  });
  it("follows explicit guide links and keeps the stockpile cap first", () => {
    const hints = activityHints(a("shugo-festival-key"), "en", t);
    expect(hints[0]).toBe("capSub:12/21");
    expect(hints).toContain(`where:${GUIDE_BY_ID.get("shugo-festival-reward-key")!.where.en}`);
  });
  it("works without a guide entry", () => {
    expect(activityHints(a("conquest"), "it", t)).toEqual(["Usa Odyle Energy."]);
    expect(activityHints(a("sanctuary"), "en", t)).toEqual([]);
  });
});
