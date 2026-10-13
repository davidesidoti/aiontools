// src/lib/build-parser.ts
// Parses one class tab of the "Personal Aion 2 Class Info" sheet. Rows 2–44 follow a fixed template
// (checked by label below); rows 45+ hold links, macro notes and screenshots in a free layout.
export type Cells = Record<string, string>;
export type BuildSkill = { name: string; rank?: number; detail?: string };

export const normName = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

// Sheet typos → the names used in game (and by the icon database).
export const SKILL_ALIASES: Record<string, string> = {
  "Focused Eyes": "Focused Eye",
  "Incandensent Blow": "Incandescent Blow",
  "Summon Ressurection": "Summon Resurrection",
  "Assult Stance": "Assault Stance",
  Siphone: "Siphon",
};

const LABELS: Record<string, RegExp> = {
  A2: /^Skills Priority/i, B2: /^Passive Priority/i, C2: /^Stigmas? Priority/i, D2: /^Arcana/i, E2: /^God Stats/i, F2: /^Equip Effects/i,
  A15: /^Genus Insight/i, A16: /^Cogni Board/i, B16: /^Natura Board/i, C16: /^Special Board/i, A22: /^Fera Board/i, B22: /^Varian Board/i,
  E15: /^Wings/i, E16: /^Meta Equipped Wings/i, E17: /^Highest Value Wings/i, E20: /^Enhancing Priority/i,
  E22: /^Offensive Titles?/i, E23: /^Defensive Titles?/i, E24: /^Special Titles?/i, E25: /^Theostones/i,
  E28: /^Manastones/i, E29: /^Stats Priority/i, E32: /^Pantheon/i, E34: /^Colossus/i, E35: /^Statues/i, E36: /^Paintings/i,
  A28: /^Soul ?Binding/i, A29: /^Weaponary/i, A32: /^Armor/i, A39: /^Passive Accessories/i,
};

const get = (c: Cells, k: string) => (c[k] ?? "").trim();
const column = (c: Cells, col: string, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => get(c, `${col}${from + i}`)).filter(Boolean);
const split = (s: string, sep: RegExp) => s.split(sep).map((x) => x.trim()).filter(Boolean);

function parseSkill(raw: string): BuildSkill {
  const ranked = raw.match(/^(\d+)\.\s*(.*)$/);
  const text = ranked ? ranked[2] : raw;
  const m = text.match(/^(.+?)(?:\s+(\(.*|-\s*.*))?$/)!;
  const name = SKILL_ALIASES[m[1].trim()] ?? m[1].trim();
  const detail = m[2]?.replace(/^-\s*/, "").trim();
  return { name, ...(ranked && { rank: Number(ranked[1]) }), ...(detail && { detail }) };
}

const parseTargets = (raw: string) => split(raw.replace(/^Target the follow(?:ing)?:\s*/i, ""), /\(\d+\)/);

function parseBoardLine(raw: string) {
  const m = raw.match(/^Line\s*\(([^)]+)\)\s*:\s*(.*)$/i);
  if (!m) throw new Error(`layout changed: board line "${raw}"`);
  return { lines: m[1].trim(), priority: split(m[2], />/) };
}

export function parseClassTab(c: Cells) {
  for (const [cell, re] of Object.entries(LABELS)) {
    if (!re.test(get(c, cell))) throw new Error(`layout changed: ${cell}="${get(c, cell)}" does not match ${re}`);
  }
  const board = (head: string, col: string, from: number) => ({
    name: get(c, head).replace(/\s*Board$/i, ""),
    lines: column(c, col, from, from + 4).map(parseBoardLine),
  });

  const soulbind: { group: string; slots: { slot: string; priority: string[] }[] }[] = [];
  for (let row = 29; row <= 44; row++) {
    const label = get(c, `A${row}`);
    const value = get(c, `B${row}`);
    if (!label) continue;
    if (!value) soulbind.push({ group: label, slots: [] });
    else soulbind.at(-1)!.slots.push({ slot: label, priority: split(value, />/) });
  }

  // Rows 45+: free layout. Any URL is a link (labelled by column A of its row); other text is a note.
  const links: { label: string; url: string }[] = [];
  const notes: string[] = [];
  const rows = [...new Set(Object.keys(c).map((k) => Number(k.replace(/^[A-Z]+/, ""))))].filter((r) => r >= 45).sort((a, b) => a - b);
  for (const row of rows) {
    const cells = Object.keys(c)
      .filter((k) => Number(k.replace(/^[A-Z]+/, "")) === row)
      .sort();
    for (const k of cells) {
      const text = get(c, k);
      const url = text.match(/https?:\/\/\S+/)?.[0];
      if (url) links.push({ label: get(c, `A${row}`).replace(/:\s*$/, "") || url, url });
      else if (!k.startsWith("A") || !cells.some((x) => /https?:\/\//.test(get(c, x)))) {
        if (!/^(Skill Layout Example|Macro|Credits)/i.test(text)) notes.push(text);
      }
    }
  }

  return {
    skills: column(c, "A", 3, 14).map(parseSkill),
    passives: column(c, "B", 3, 14).map(parseSkill),
    stigmas: column(c, "C", 3, 14).map(parseSkill),
    arcana: column(c, "D", 3, 14),
    godStats: column(c, "E", 3, 14),
    equipEffects: column(c, "F", 3, 14).map(parseTargets),
    boards: [board("A16", "A", 17), board("B16", "B", 17), board("C16", "C", 17), board("A22", "A", 23), board("B22", "B", 23)],
    wings: { meta: get(c, "F16"), leveling: get(c, "F17") },
    enhancing: split(get(c, "F20"), />/),
    titles: { offensive: split(get(c, "F22"), /[>/]/), defensive: split(get(c, "F23"), /[>/]/), special: split(get(c, "F24"), /[>/]/) },
    theostones: get(c, "F26"),
    manastones: split(get(c, "F29"), />/),
    pantheon: { colossus: get(c, "F34"), statues: get(c, "F35"), paintings: get(c, "F36") },
    soulbind,
    links,
    notes,
  };
}
export type ParsedBuild = ReturnType<typeof parseClassTab>;
