// src/components/guides/roadmap-view.tsx
"use client";
import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useUserStore } from "@/store/user-store";
import { ROADMAP, roadmapProgress, toggleRoadmapItem } from "@/lib/guides";
import { localize } from "@/lib/activities";
import { cn } from "@/lib/utils";

export function RoadmapView() {
  const t = useTranslations("guides.roadmap");
  const locale = useLocale();
  const L = (x: { en: string; it: string }) => localize(x, locale);
  const done = useUserStore((s) => s.data.roadmap.done);
  const hydrated = useUserStore((s) => s.hydrated);
  const update = useUserStore((s) => s.update);
  const doneSet = new Set(done);
  const p = roadmapProgress(done);

  useEffect(() => {
    // Deferred: after a client navigation the URL (and its hash) is written once this view has mounted.
    const timer = setTimeout(() => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
    });
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground" aria-live="polite">{hydrated ? t("progress", p) : "\u00a0"}</p>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} />
          </div>
        </div>
        {ROADMAP.phases.map((phase) => (
          <section key={phase.id} id={phase.id} aria-labelledby={`${phase.id}-title`} className="scroll-mt-24 rounded-xl border border-border bg-card p-4">
            <h2 id={`${phase.id}-title`} className="font-display text-lg font-semibold">{L(phase.title)}</h2>
            {phase.intro && <p className="mt-1 text-sm text-muted-foreground">{L(phase.intro)}</p>}
            <ul className="mt-3 space-y-1">
              {phase.items.map((item) =>
                item.kind === "step" ? (
                  <li key={item.id}>
                    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-accent/40">
                      <input
                        type="checkbox"
                        className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]"
                        checked={doneSet.has(item.id)}
                        disabled={!hydrated}
                        onChange={() => update((d) => toggleRoadmapItem(d, item.id))}
                      />
                      <span className={cn("whitespace-pre-line text-sm", doneSet.has(item.id) && "text-muted-foreground line-through")}>
                        {L(item.text)}
                        {item.url && (
                          <>
                            {" "}
                            <a href={item.url} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">{t("open")}</a>
                          </>
                        )}
                      </span>
                    </label>
                  </li>
                ) : (
                  <li key={item.id} className={cn("whitespace-pre-line rounded-md border px-3 py-2 text-sm", item.kind === "warning" ? "border-destructive/60 bg-destructive/10" : "border-border bg-muted/40")}>
                    <span className="font-medium">{t(item.kind)}: </span>
                    {L(item.text)}
                  </li>
                ),
              )}
            </ul>
          </section>
        ))}
      </div>
      <aside className="space-y-4 lg:sticky lg:top-20">
        {([["systems", ROADMAP.systems], ["targets", ROADMAP.targets]] as const).map(([key, items]) => (
          <section key={key} className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-2 font-display text-base font-semibold">{t(key)}</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm">{items.map((x) => <li key={x.en}>{L(x)}</li>)}</ul>
          </section>
        ))}
      </aside>
    </div>
  );
}
