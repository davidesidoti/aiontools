// src/lib/sync-code.ts
import { wordlist } from "@scure/bip39/wordlists/english.js";

export const SYNC_CODE_RE = /^[a-z]{3,8}(-[a-z]{3,8}){2}-\d{4}$/;

// Unbiased integer in [0, n) from the platform CSPRNG (rejection sampling).
function secureRandom(n: number): number {
  const buf = new Uint32Array(1);
  const limit = Math.floor(2 ** 32 / n) * n;
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % n;
}

export function generateSyncCode(rand: (n: number) => number = secureRandom): string {
  const word = () => wordlist[rand(wordlist.length)];
  return `${word()}-${word()}-${word()}-${String(rand(10_000)).padStart(4, "0")}`;
}

export function normalizeSyncCode(input: string): string {
  return input.trim().toLowerCase();
}
