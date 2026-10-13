// src/components/shell/reset-countdown.tsx
"use client";
import { useTranslations } from "next-intl";
import { useNow } from "@/hooks/use-now";
import { useUserStore } from "@/store/user-store";
import { nextResetAt, type ResetPeriod } from "@/lib/reset";
import { formatCountdown } from "@/lib/format";
import { cn } from "@/lib/utils";

export function useResetCountdown(period: ResetPeriod): string | null {
  const t = useTranslations("reset.units");
  const now = useNow();
  const region = useUserStore((s) => s.data.settings.region);
  if (!now) return null;
  return formatCountdown(nextResetAt(now, region, period).getTime() - now.getTime(), { d: t("d"), h: t("h"), m: t("m") });
}

export function ResetCountdown({ period, variant = "compact" }: { period: ResetPeriod; variant?: "compact" | "large" }) {
  const t = useTranslations("reset");
  const value = useResetCountdown(period);
  return (
    <div className={cn("flex flex-col", variant === "large" && "rounded-lg border border-border bg-card p-4")}>
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{t(period === "day" ? "daily" : "weekly")}</span>
      <span className={cn("font-mono tabular-nums text-primary", variant === "large" ? "text-3xl" : "text-sm")}>{value ?? "—"}</span>
    </div>
  );
}
