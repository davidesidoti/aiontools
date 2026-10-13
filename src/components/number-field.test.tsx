// src/components/number-field.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NumberField } from "./number-field";

const setup = (props: Partial<React.ComponentProps<typeof NumberField>> = {}) => {
  const onCommit = vi.fn();
  render(<NumberField label="Price" value={1799} min={0} onCommit={onCommit} {...props} />);
  return { onCommit, input: screen.getByLabelText("Price") as HTMLInputElement, user: userEvent.setup() };
};

describe("NumberField", () => {
  it("commits a valid number on blur", async () => {
    const { onCommit, input, user } = setup();
    await user.clear(input);
    await user.type(input, "2000");
    await user.tab();
    expect(onCommit).toHaveBeenCalledWith(2000);
  });
  it("commits on Enter and accepts a decimal comma", async () => {
    const { onCommit, input, user } = setup({ value: 93.1, min: 0.1, max: 100 });
    await user.clear(input);
    await user.type(input, "93,5{Enter}");
    expect(onCommit).toHaveBeenCalledWith(93.5);
  });
  it("snaps back on garbage, empty or out-of-range input", async () => {
    const { onCommit, input, user } = setup({ max: 1000 });
    for (const bad of ["abc", "-5", "5000"]) {
      await user.clear(input);
      await user.type(input, bad);
      await user.tab();
      expect(input.value).toBe("1799");
    }
    await user.clear(input);
    await user.tab();
    expect(input.value).toBe("1799");
    expect(onCommit).not.toHaveBeenCalled();
  });
});
