import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NumberField } from "./number-field";

const setup = (props: Partial<React.ComponentProps<typeof NumberField>> = {}) => {
  const onCommit = vi.fn();
  render(<NumberField label="Price" value={1799} min={0} locale="en" onCommit={onCommit} {...props} />);
  return { onCommit, input: screen.getByLabelText("Price") as HTMLInputElement, user: userEvent.setup() };
};

describe("NumberField", () => {
  it("shows the value with the locale's grouping", () => {
    expect(setup({ value: 533333 }).input.value).toBe("533,333");
  });
  it("shows Italian grouping and decimals", () => {
    expect(setup({ value: 1234.5, locale: "it" }).input.value).toBe("1.234,5");
  });
  it("commits a valid number on blur", async () => {
    const { onCommit, input, user } = setup();
    await user.clear(input);
    await user.type(input, "2000");
    await user.tab();
    expect(onCommit).toHaveBeenCalledWith(2000);
  });
  it("reads English thousands separators as grouping, not decimals", async () => {
    const { onCommit, input, user } = setup();
    await user.clear(input);
    await user.type(input, "150,000{Enter}");
    expect(onCommit).toHaveBeenCalledWith(150000);
  });
  it("reads Italian dots as grouping and commas as decimals", async () => {
    const { onCommit, input, user } = setup({ locale: "it", value: 93.1, max: 2000 });
    await user.clear(input);
    await user.type(input, "1.000{Enter}");
    expect(onCommit).toHaveBeenLastCalledWith(1000);
    await user.clear(input);
    await user.type(input, "93,5{Enter}");
    expect(onCommit).toHaveBeenLastCalledWith(93.5);
  });
  it("snaps back on garbage, empty or out-of-range input", async () => {
    const { onCommit, input, user } = setup({ max: 1000 });
    for (const bad of ["abc", "-5", "5000"]) {
      await user.clear(input);
      await user.type(input, bad);
      await user.tab();
      expect(input.value).toBe("1,799");
    }
    await user.clear(input);
    await user.tab();
    expect(input.value).toBe("1,799");
    expect(onCommit).not.toHaveBeenCalled();
  });
});
