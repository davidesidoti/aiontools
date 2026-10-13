import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("tooling", () => {
  it("resolves @/ alias and runs", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });
});
