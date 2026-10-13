"use client";
import { useCallback, useSyncExternalStore } from "react";

// Null on the server and during hydration so markup matches; re-renders once per interval after mount.
export function useNow(intervalMs = 30_000): Date | null {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const id = setInterval(onChange, intervalMs);
      return () => clearInterval(id);
    },
    [intervalMs],
  );
  const tick = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / intervalMs),
    () => null,
  );
  return tick === null ? null : new Date();
}
