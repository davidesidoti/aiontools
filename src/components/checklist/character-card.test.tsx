// src/components/checklist/character-card.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/en.json";
import { CharacterCard } from "./character-card";
import { useUserStore } from "@/store/user-store";
import { createDefaultUserData } from "@/lib/user-data";
import { addCharacter } from "@/lib/characters";
import { TooltipProvider } from "@/components/ui/tooltip";

beforeEach(() => {
  let d = createDefaultUserData(new Date("2026-10-14T10:00:00.000Z"));
  d = addCharacter(d, { name: "Aria", classId: "chanter" }, "m");
  d = addCharacter(d, { name: "Kael", classId: "cleric" }, "x");
  useUserStore.setState({ data: d, hydrated: true, corrupted: false });
});

const renderCard = (id: string) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <TooltipProvider><CharacterCard characterId={id} /></TooltipProvider>
    </NextIntlClientProvider>,
  );

describe("CharacterCard", () => {
  it("main sees main-only activities", () => {
    renderCard("m");
    expect(screen.getByText("Duty Missions")).toBeInTheDocument();
  });
  it("alt does not see main-only activities", () => {
    renderCard("x");
    expect(screen.queryByText("Duty Missions")).toBeNull();
    expect(screen.getByText("Nightmare")).toBeInTheDocument();
  });
});
