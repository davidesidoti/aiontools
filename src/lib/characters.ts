// src/lib/characters.ts
import type { UserData } from "./user-data";

export const MAX_CHARACTERS = 9;
const cleanName = (name: string) => name.trim().slice(0, 32);

export function addCharacter(data: UserData, input: { name: string; classId: string }, id: string = crypto.randomUUID()): UserData {
  const name = cleanName(input.name);
  if (!name || data.characters.length >= MAX_CHARACTERS) return data;
  return { ...data, characters: [...data.characters, { id, name, classId: input.classId, isMain: data.characters.length === 0 }] };
}

export function removeCharacter(data: UserData, id: string): UserData {
  const removed = data.characters.find((c) => c.id === id);
  if (!removed) return data;
  const rest = data.characters.filter((c) => c.id !== id);
  const characters = removed.isMain && rest.length ? rest.map((c, i) => ({ ...c, isMain: i === 0 })) : rest;
  const progress = { ...data.checklist.progress };
  delete progress[id];
  return { ...data, characters, checklist: { ...data.checklist, progress } };
}

export function setMain(data: UserData, id: string): UserData {
  if (!data.characters.some((c) => c.id === id)) return data;
  return { ...data, characters: data.characters.map((c) => ({ ...c, isMain: c.id === id })) };
}

export function updateCharacter(data: UserData, id: string, patch: { name?: string; classId?: string }): UserData {
  const name = patch.name === undefined ? undefined : cleanName(patch.name);
  if (name === "") return data;
  return {
    ...data,
    characters: data.characters.map((c) =>
      c.id === id ? { ...c, ...(name !== undefined && { name }), ...(patch.classId && { classId: patch.classId }) } : c,
    ),
  };
}
