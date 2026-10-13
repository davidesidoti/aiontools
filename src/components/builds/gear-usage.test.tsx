// src/components/builds/gear-usage.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/en.json";
import { useUserStore } from "@/store/user-store";
import { createDefaultUserData, type UserData } from "@/lib/user-data";
import type { RegionGear } from "@/lib/gear";
import { EndgameGear, TitlesWithShare, type EndgameRow } from "./gear-usage";

const usage = (weapon: [string, number][], sample: number) => ({
  sample,
  sourceUrls: ["https://gamewith.ai/aion2/en/build-stats/nae/ranger"],
  slots: { weapon: weapon.map(([name, share]) => ({ name, share })), belt: [{ name: "Noble Belt", share: 40 }] },
  titles: [{ name: "Saint of Verteron", share: 11 }],
  wings: [],
});
const gear: RegionGear = {
  global: { fetchedAt: "2026-10-07", usage: usage([["Spiritforged Bow", 84], ["Aulamus Bow", 8], ["Rupture Longbow", 2]], 1785) },
  tw: { fetchedAt: "2026-10-07", usage: usage([["Splendent Genesis Dragon Lord Bow", 61]], 1080) },
};
const rows: EndgameRow[] = [
  { slot: "weapon", label: "Weapon", item: "Splendent Dragon Lord Bow", how: "Craft it", match: ["dragon lord", "ludra"] },
  { slot: "belt", label: "Belt", item: "Noble Belt", how: "Keep upgrading it", match: ["noble belt"] },
];
const curated = { updated: "2026-10-13", sources: [{ label: "Aion2 Guidance", url: "https://aion2guidance.com/en/gear" }] };

const setRegion = (region: UserData["settings"]["region"], hydrated = true) => {
  const d = createDefaultUserData(new Date("2026-10-14T10:00:00.000Z"));
  useUserStore.setState({ data: { ...d, settings: { ...d.settings, region } }, hydrated });
};
const renderGear = () =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <EndgameGear rows={rows} gear={gear} curated={curated} />
    </NextIntlClientProvider>,
  );

beforeEach(() => setRegion("global"));

describe("EndgameGear", () => {
  it("shows the recommendation, its share when used, and 'uncommon' when not in the top 3", () => {
    renderGear();
    const weapon = screen.getByRole("row", { name: /Weapon/ });
    expect(within(weapon).getByText("Splendent Dragon Lord Bow")).toBeInTheDocument();
    expect(within(weapon).getByText("Uncommon")).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /Belt/ })).getByText("Used by 40%")).toBeInTheDocument();
    expect(screen.getByText(/GameWith, Oct 7, 2026, 1,785 characters/)).toBeInTheDocument();
  });
  it("lists the most used items for a slot", () => {
    renderGear();
    expect(within(screen.getByRole("row", { name: /Weapon/ })).getByText("Spiritforged Bow")).toBeInTheDocument();
  });
  it("switches to the stored region and hides the curated columns outside Global", () => {
    setRegion("tw");
    renderGear();
    expect(screen.getByText(/later season/)).toBeInTheDocument();
    expect(screen.queryByText("Splendent Dragon Lord Bow")).not.toBeInTheDocument();
    expect(screen.getByText("Splendent Genesis Dragon Lord Bow")).toBeInTheDocument();
  });
  it("renders Global until the store has hydrated", () => {
    setRegion("tw", false);
    renderGear();
    expect(screen.queryByText(/later season/)).not.toBeInTheDocument();
  });
});

describe("TitlesWithShare", () => {
  it("adds the usage share next to titles that match", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <TitlesWithShare names={["Saint of Verteron", "Rule All Creation"]} gear={gear} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("Saint of Verteron").parentElement).toHaveTextContent("11%");
    expect(screen.getByText("Rule All Creation").parentElement).not.toHaveTextContent("%");
  });
});
