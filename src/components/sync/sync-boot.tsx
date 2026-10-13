// src/components/sync/sync-boot.tsx
"use client";
import { useEffect } from "react";
import { useUserStore } from "@/store/user-store";
import { useSyncStore } from "@/store/sync-store";
import { ConflictDialog } from "./conflict-dialog";

// Starts sync once local data is loaded, so the first pull compares against the real local copy.
export function SyncBoot() {
  const hydrated = useUserStore((s) => s.hydrated);
  useEffect(() => {
    if (hydrated) useSyncStore.getState().start();
  }, [hydrated]);
  return <ConflictDialog />;
}
