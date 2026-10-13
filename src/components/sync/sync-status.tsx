// src/components/sync/sync-status.tsx
"use client";
import { Cloud, CloudOff, CloudUpload, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncStore } from "@/store/sync-store";
import { cn } from "@/lib/utils";

const ICONS = { synced: Cloud, pending: CloudUpload, offline: CloudOff, error: TriangleAlert } as const;

export function SyncStatus() {
  const t = useTranslations("sync.status");
  const status = useSyncStore((s) => s.status);
  if (status === "off") return null;
  const Icon = ICONS[status];
  return (
    <span
      role="status"
      aria-label={t(status)}
      className={cn("flex items-center gap-1.5 text-xs", status === "error" ? "text-destructive" : "text-muted-foreground")}
    >
      <Icon className="size-4" aria-hidden />
      <span className="hidden sm:inline" aria-hidden>{t(status)}</span>
    </span>
  );
}
