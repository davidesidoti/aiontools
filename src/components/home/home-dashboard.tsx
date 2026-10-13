// src/components/home/home-dashboard.tsx
"use client";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/user-store";
import { ACTIVITIES, type Section } from "@/lib/activities";
import { progressFor } from "@/lib/checklist";
import { className } from "@/lib/classes";
import { ProgressRing } from "@/components/checklist/progress-ring";
import { ResetCountdown } from "@/components/shell/reset-countdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

const ROWS: Section[] = ["daily", "weekly", "recharge"];

export function HomeDashboard() {
  const t = useTranslations("home");
  const tc = useTranslations("checklist");
  const { data, hydrated } = useUserStore();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <ResetCountdown period="day" variant="large" />
        <ResetCountdown period="week" variant="large" />
      </div>

      {!hydrated ? (
        <div className="h-40 animate-pulse rounded-lg bg-card" />
      ) : data.characters.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="mb-4 text-muted-foreground">{t("noCharacters")}</p>
          <Link href="/settings" className={buttonVariants()}>{t("addCharacters")}</Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.characters.map((c) => (
              <Card key={c.id} className="transition-shadow hover:shadow-[0_0_24px_-8px_var(--primary)]">
                <CardHeader className="flex-row items-center justify-between gap-2">
                  <CardTitle className="font-display">{c.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Link href={`/builds/${c.classId}`} className="text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline">{className(c.classId)}</Link>
                    {c.isMain && <Badge>{t("main")}</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-2">
                  {ROWS.map((s) => {
                    const p = progressFor(data, c.id, ACTIVITIES, [s]);
                    return (
                      <div key={s} className="flex flex-col items-center gap-1 text-center">
                        <ProgressRing value={p.total ? p.done / p.total : 0} label={`${tc(`sections.${s}`)}: ${tc("progressLabel", p)}`} size={48} />
                        <span className="text-xs text-muted-foreground">{tc(`sections.${s}`)}</span>
                        <span className="font-mono text-xs tabular-nums">{p.done}/{p.total}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
          <Link href="/checklist" className={buttonVariants({ size: "lg", className: "min-h-11" })}>{t("openChecklist")}</Link>
        </>
      )}
    </div>
  );
}
