// src/components/shell/event-countdown.tsx
"use client";
import { useLocale, useTranslations } from "next-intl";
import { useNow } from "@/hooks/use-now";
import { useUserStore } from "@/store/user-store";
import { EVENTS, EVENTS_META, eventStatus, type EventId, type GameEvent } from "@/lib/events";
import { formatCountdown } from "@/lib/format";
import { cn } from "@/lib/utils";

// Null on the server and before mount (useNow), so markup matches.
function useEventStatus(event: GameEvent) {
  const now = useNow();
  const region = useUserStore((s) => s.data.settings.region);
  const server = useUserStore((s) => s.data.settings.server);
  return now ? { now, ...eventStatus(event, region, server, now) } : null;
}

function useCountdownText(event: GameEvent): { text: string; open: boolean } | null {
  const t = useTranslations("events");
  const tu = useTranslations("reset.units");
  const s = useEventStatus(event);
  if (!s) return null;
  const units = { d: tu("d"), h: tu("h"), m: tu("m") };
  return s.open
    ? { text: t("open", { left: formatCountdown(s.end.getTime() - s.now.getTime(), units) }), open: true }
    : { text: formatCountdown(s.start.getTime() - s.now.getTime(), units), open: false };
}

const byId = (id: EventId) => EVENTS.find((e) => e.id === id)!;

export function EventCountdown({ id }: { id: EventId }) {
  const locale = useLocale();
  const event = byId(id);
  const value = useCountdownText(event);
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{event.name[locale === "it" ? "it" : "en"]}</span>
      <span className={cn("font-mono text-sm tabular-nums", value?.open ? "font-semibold text-emerald-400" : "text-primary")}>{value?.text ?? "—"}</span>
    </div>
  );
}

function EventRow({ event }: { event: GameEvent }) {
  const locale = useLocale();
  const value = useCountdownText(event);
  const s = useEventStatus(event);
  const when = s && new Intl.DateTimeFormat(locale, { weekday: "short", hour: "2-digit", minute: "2-digit" }).format(s.start);
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-border/60 py-2 first:border-t-0">
      <span>{event.name[locale === "it" ? "it" : "en"]}</span>
      <span className="flex items-baseline gap-3">
        <span className="text-xs text-muted-foreground" data-testid={`event-when-${event.id}`}>{when ?? ""}</span>
        <span className={cn("font-mono text-sm tabular-nums", value?.open ? "font-semibold text-emerald-400" : "text-primary")}>{value?.text ?? "—"}</span>
      </span>
    </li>
  );
}

export function NextEvents() {
  const t = useTranslations("events");
  const locale = useLocale();
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(EVENTS_META.checked));
  return (
    <section aria-labelledby="next-events-title" className="rounded-lg border border-border bg-card p-4">
      <h2 id="next-events-title" className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{t("title")}</h2>
      <ul className="text-sm">{EVENTS.map((e) => <EventRow key={e.id} event={e} />)}</ul>
      <p className="mt-2 text-xs text-muted-foreground">
        {t("community", { date })}{" "}
        {EVENTS_META.sources.map((s) => (
          <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="mr-2 inline-flex min-h-11 items-center text-primary underline underline-offset-2">{s.label}</a>
        ))}
      </p>
    </section>
  );
}
