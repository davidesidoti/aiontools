// src/lib/builds.test.ts
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { BUILDS, BUILD_IDS, iconFor, classIcon, KNOWN_MISSING_ICONS } from "./builds";
import { CLASSES } from "./classes";

describe("builds content", () => {
  it("has a build for every class", () => {
    expect([...BUILD_IDS].sort()).toEqual(CLASSES.map((c) => c.id).sort());
  });
  it("every skill, passive and stigma resolves to an icon or is a known gap", () => {
    const unresolved = BUILD_IDS.flatMap((id) =>
      [...BUILDS[id].skills, ...BUILDS[id].passives, ...BUILDS[id].stigmas]
        .filter((s) => !iconFor(id, s.name) && !KNOWN_MISSING_ICONS.has(`${id}:${s.name}`))
        .map((s) => `${id}:${s.name}`),
    );
    expect(unresolved).toEqual([]);
  });
  it("only references files that exist", () => {
    for (const id of BUILD_IDS) {
      expect(existsSync(join("public", classIcon(id))), id).toBe(true);
      for (const s of BUILDS[id].screenshots) expect(existsSync(join("public", s)), s).toBe(true);
      for (const s of [...BUILDS[id].skills, ...BUILDS[id].passives, ...BUILDS[id].stigmas]) {
        const icon = iconFor(id, s.name);
        if (icon) expect(existsSync(join("public", icon)), icon).toBe(true);
      }
    }
  });
  it("every class has its five boards and three soul binding groups", () => {
    for (const id of BUILD_IDS) {
      expect(BUILDS[id].boards).toHaveLength(5);
      expect(BUILDS[id].soulbind).toHaveLength(3);
    }
  });
});
