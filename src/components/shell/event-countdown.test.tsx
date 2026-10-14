// src/components/shell/event-countdown.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/en.json";
import { useUserStore } from "@/store/user-store";
import { createDefaultUserData } from "@/lib/user-data";
import { EventCountdown, NextEvents } from "./event-countdown";

const renderIt = (ui: React.ReactNode) => render(<NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">{ui}</NextIntlClientProvider>);

beforeEach(() => {
  useUserStore.setState({ data: createDefaultUserData(new Date("2026-10-14T00:00:00Z")), hydrated: true });
});
afterEach(() => vi.useRealTimers());

describe("EventCountdown", () => {
  it("counts down to the next Rift (EU)", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-14T10:20:00Z")); // 12:20 CEST, next Rift 14:00 CEST = 12:00Z
    renderIt(<EventCountdown id="rift" />);
    expect(screen.getByText("Spacetime Rift")).toBeInTheDocument();
    expect(screen.getByText("1h 40m")).toBeInTheDocument();
  });
  it("shows the time left while the window is open", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-14T12:03:00Z")); // Rift opened at 12:00Z, 10-minute window
    renderIt(<EventCountdown id="rift" />);
    expect(screen.getByText("Open · 7m")).toBeInTheDocument();
  });
});

describe("NextEvents", () => {
  it("lists every event with the sources note", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-14T10:20:00Z"));
    renderIt(<NextEvents />);
    for (const name of ["Shugo Festival", "Dimensional Invasion", "Spacetime Rift", "Artifact Siege", "Guardian Lord Nahma"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.getByText(/Community times, checked/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "shugo.gg" })).toHaveAttribute("href", "https://shugo.gg/timers");
  });
});
