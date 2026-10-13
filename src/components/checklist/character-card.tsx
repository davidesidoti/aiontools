// src/components/checklist/character-card.tsx
"use client";
import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useUserStore } from "@/store/user-store";
import { ACTIVITIES, SECTIONS, maxFor, type Activity, type Section } from "@/lib/activities";
import { getCount, setCount, progressFor } from "@/lib/checklist";
import { className } from "@/lib/classes";
import { useResetCountdown } from "@/components/shell/reset-countdown";
import { ChecklistControl } from "./checklist-control";
import { activityHints } from "./activity-hints";
import { ProgressRing } from "./progress-ring";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function ActivityName({ a }: { a: Activity }) {
  const t = useTranslations("checklist");
  const locale = useLocale();
  const lines = activityHints(a, locale, (key, values) => t(key, values));
  if (!lines.length) return <span className="truncate">{a.name}</span>;
  return (
    <Tooltip>
      <TooltipTrigger className="cursor-help truncate text-left underline decoration-dotted underline-offset-4">{a.name}</TooltipTrigger>
      <TooltipContent className="max-w-xs">{lines.map((l) => <p key={l}>{l}</p>)}</TooltipContent>
    </Tooltip>
  );
}

function SectionHeading({ section }: { section: Section }) {
  const t = useTranslations("checklist");
  const time = useResetCountdown(section === "weekly" ? "week" : "day");
  return (
    <h4 className="mt-4 mb-1 flex items-baseline text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
      {t(`sections.${section}`)}
      <span className="ml-auto text-xs normal-case tracking-normal">{time && t("resetsIn", { time })}</span>
    </h4>
  );
}

export function CharacterCard({ characterId }: { characterId: string }) {
  const t = useTranslations("checklist");
  const tHome = useTranslations("home");
  const data = useUserStore((s) => s.data);
  const update = useUserStore((s) => s.update);
  const c = data.characters.find((x) => x.id === characterId);
  if (!c) return null;
  const overall = progressFor(data, c.id, ACTIVITIES, SECTIONS);

  return (
    <article className="rounded-xl border border-border bg-card px-4 py-3.5">
      <header className="flex items-center gap-2.5 border-b border-border pb-2.5">
        <h3 className="font-display text-lg font-semibold">{c.name}</h3>
        <span className="text-xs text-muted-foreground">{className(c.classId)}</span>
        {c.isMain && <Badge>{tHome("main")}</Badge>}
        <span className="ml-auto">
          <ProgressRing value={overall.total ? overall.done / overall.total : 0} label={t("progressLabel", overall)} size={34} />
        </span>
      </header>
      {SECTIONS.map((section) => {
        const rows = ACTIVITIES.filter((a) => a.section === section && maxFor(a, c.isMain) > 0);
        if (!rows.length) return null;
        return (
          <section key={section}>
            <SectionHeading section={section} />
            <ul>
              {rows.map((a) => {
                const max = maxFor(a, c.isMain);
                const count = getCount(data, c.id, a);
                const done = count >= max;
                return (
                  <li key={a.id} className={cn("flex items-center justify-between gap-2 border-t border-border/70 transition-opacity", done && "opacity-45")}>
                    <span className="flex min-w-0 items-center gap-1.5 text-sm">
                      <ActivityName a={a} />
                      {done && <Check className="size-3.5 shrink-0 text-primary" aria-label={t("done")} />}
                    </span>
                    <ChecklistControl activity={a.name} character={c.name} count={count} max={max} onChange={(n) => update((d) => setCount(d, c.id, a, n))} />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </article>
  );
}
