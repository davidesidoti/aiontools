// src/components/checklist/checklist-control.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/en.json";
import { ChecklistControl } from "./checklist-control";

const renderControl = (props: Partial<React.ComponentProps<typeof ChecklistControl>> = {}) => {
  const onChange = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ChecklistControl activity="Duty Missions" character="Aria" count={2} max={5} onChange={onChange} {...props} />
    </NextIntlClientProvider>,
  );
  return onChange;
};

describe("ChecklistControl — pips (max ≤ 7)", () => {
  it("renders one pip per use inside a labelled group", () => {
    renderControl();
    expect(screen.getByRole("group", { name: "Duty Missions, Aria: 2 of 5" })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Duty Missions, Aria: remove one" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Duty Missions, Aria: set to 3" })).toHaveAttribute("aria-pressed", "false");
  });
  it("clicking pip n sets n; clicking the last lit pip sets n-1", async () => {
    const user = userEvent.setup();
    const onChange = renderControl();
    await user.click(screen.getByRole("button", { name: "Duty Missions, Aria: set to 4" }));
    expect(onChange).toHaveBeenLastCalledWith(4);
    await user.click(screen.getByRole("button", { name: "Duty Missions, Aria: remove one" }));
    expect(onChange).toHaveBeenLastCalledWith(1);
  });
  it("max 1 is a single pip that toggles", async () => {
    const user = userEvent.setup();
    const onChange = renderControl({ max: 1, count: 1 });
    await user.click(screen.getByRole("button", { name: "Duty Missions, Aria: remove one" }));
    expect(onChange).toHaveBeenLastCalledWith(0);
  });
});

describe("ChecklistControl — bar (max > 7)", () => {
  it("shows n/max with − and + buttons", async () => {
    const user = userEvent.setup();
    const onChange = renderControl({ activity: "Daily Dungeon", max: 14, count: 2 });
    expect(screen.getByRole("group", { name: "Daily Dungeon, Aria: 2 of 14" })).toHaveTextContent("2/14");
    await user.click(screen.getByRole("button", { name: "Daily Dungeon, Aria: add one" }));
    expect(onChange).toHaveBeenLastCalledWith(3);
    await user.click(screen.getByRole("button", { name: "Daily Dungeon, Aria: remove one" }));
    expect(onChange).toHaveBeenLastCalledWith(1);
  });
  it("disables − at 0 and + at max", () => {
    renderControl({ activity: "Daily Dungeon", max: 14, count: 0 });
    expect(screen.getByRole("button", { name: "Daily Dungeon, Aria: remove one" })).toBeDisabled();
  });
});
