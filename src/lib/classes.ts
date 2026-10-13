// src/lib/classes.ts
// shortcut: hardcoded class list until plan 3 imports class builds; replace with content/classes then.
export const CLASSES = [
  { id: "chanter", name: "Chanter" },
  { id: "ranger", name: "Ranger" },
  { id: "cleric", name: "Cleric" },
  { id: "spirit-master", name: "Spirit Master" },
  { id: "gladiator", name: "Gladiator" },
  { id: "sorcerer", name: "Sorcerer" },
  { id: "templar", name: "Templar" },
  { id: "assassin", name: "Assassin" },
] as const;

export const DEFAULT_CLASS_ID = "chanter";

export const className = (id: string) => CLASSES.find((c) => c.id === id)?.name ?? id;
