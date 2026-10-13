// src/components/guides/guide-content-view.tsx
"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { CONTENT_GUIDE, GUIDE_SECTIONS, filterGuide, type GuideEntry, type GuideFilter } from "@/lib/guides";
import { localize } from "@/lib/activities";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ALL: GuideFilter = { section: "all", mode: "all", scope: "all", q: "" };
const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const readHash = () => decodeURIComponent(window.location.hash.slice(1));

function Chips<T extends string>(props: { label: string; options: readonly T[]; value: T; onChange(v: T): void; text(v: T): string }) {
  return (
    <div role="group" aria-label={props.label} className="flex flex-wrap gap-1.5">
      {props.options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={props.value === o}
          onClick={() => props.onChange(o)}
          className={cn(
            "min-h-11 rounded-full border px-4 text-sm transition-colors",
            props.value === o ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground",
          )}
        >
          {props.text(o)}
        </button>
      ))}
    </div>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn(wide && "sm:col-span-2")}>
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line">{children}</dd>
    </div>
  );
}

function Entry({ e, open, onToggle }: { e: GuideEntry; open: boolean; onToggle(open: boolean): void }) {
  const t = useTranslations("guides.content");
  const locale = useLocale();
  const L = (x: { en: string; it: string }) => localize(x, locale);
  return (
    <details id={e.id} open={open} onToggle={(ev) => onToggle(ev.currentTarget.open)} className="group scroll-mt-24 rounded-xl border border-border bg-card open:border-primary/50">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
        {e.icon && (
          // eslint-disable-next-line @next/next/no-img-element -- small sheet icons of unknown size
          <img src={e.icon} alt="" width={32} height={32} className="size-8 shrink-0 rounded" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{e.name}</span>
          <span className="block text-xs text-muted-foreground">{L(e.type)} · {L(e.count)}</span>
        </span>
        <span className="hidden gap-1 sm:flex">
          {e.modes.map((m) => <Badge key={m} variant="secondary">{t(`modes.${m}`)}</Badge>)}
          {e.scope === "main" && <Badge variant="outline">{t("mainOnly")}</Badge>}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <dl className="grid gap-3 border-t border-border px-4 py-3 text-sm sm:grid-cols-2">
        <Field label={t("requirements")}>{L(e.requirements)}</Field>
        <Field label={t("where")}>{e.where}</Field>
        <Field label={t("rewards")} wide>{e.rewards}</Field>
        <Field label={t("strategy")} wide>{L(e.strategy)}</Field>
        {e.notes && <Field label={t("notes")} wide>{L(e.notes)}</Field>}
      </dl>
    </details>
  );
}

export function GuideContentView() {
  const t = useTranslations("guides.content");
  const locale = useLocale();
  const [filter, setFilter] = useState<GuideFilter>(ALL);
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const hash = useSyncExternalStore(subscribeHash, readHash, () => "");
  const entries = useMemo(() => filterGuide(CONTENT_GUIDE, filter, locale), [filter, locale]);
  const set = (patch: Partial<GuideFilter>) => setFilter((f) => ({ ...f, ...patch }));

  useEffect(() => {
    if (hash) document.getElementById(hash)?.scrollIntoView({ block: "start" });
  }, [hash]);

  // A client navigation (router.push) writes the URL after this view mounts and fires no hashchange: re-read it once.
  useEffect(() => {
    const id = setTimeout(() => window.dispatchEvent(new HashChangeEvent("hashchange")));
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <Input type="search" aria-label={t("search")} placeholder={t("search")} value={filter.q} onChange={(e) => set({ q: e.target.value })} className="min-h-11" />
        <Chips label={t("filters.section")} options={["all", ...GUIDE_SECTIONS] as const} value={filter.section} onChange={(section) => set({ section })} text={(v) => t(`sections.${v}`)} />
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Chips label={t("filters.mode")} options={["all", "pve", "pvp"] as const} value={filter.mode} onChange={(mode) => set({ mode })} text={(v) => t(`modes.${v}`)} />
          <Chips label={t("filters.scope")} options={["all", "main", "alt"] as const} value={filter.scope} onChange={(scope) => set({ scope })} text={(v) => t(`scopes.${v}`)} />
        </div>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">{t("results", { count: entries.length })}</p>
      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <Entry key={e.id} e={e} open={toggled[e.id] ?? e.id === hash} onToggle={(open) => setToggled((s) => (s[e.id] === open ? s : { ...s, [e.id]: open }))} />
          ))}
        </div>
      )}
    </div>
  );
}
