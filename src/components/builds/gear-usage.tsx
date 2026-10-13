// src/components/builds/gear-usage.tsx
"use client";
import { useLocale, useTranslations } from "next-intl";
import { useUserStore } from "@/store/user-store";
import { findMatch, normGear, type RegionGear } from "@/lib/gear";
import type { GearSlot, UsageEntry } from "@/lib/gear-usage-parser";
import type { RegionId } from "@/lib/regions";

export type EndgameRow = { slot: GearSlot; label: string; item: string; how: string; alt?: string; match: string[] };

// Server HTML and the first client render use Global; the stored region applies once the store has hydrated.
function useUsageRegion(): RegionId {
  const hydrated = useUserStore((s) => s.hydrated);
  const region = useUserStore((s) => s.data.settings.region);
  return hydrated ? region : "global";
}

function useFormat() {
  const locale = useLocale();
  return {
    pct: (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n),
    num: (n: number) => new Intl.NumberFormat(locale).format(n),
    date: (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(iso)),
  };
}

function ItemName({ name, icon }: { name: string; icon?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element -- small self-hosted game icons
        <img src={icon} alt="" width={28} height={28} className="size-7 rounded" loading="lazy" />
      ) : null}
      <span>{name}</span>
    </span>
  );
}

function EntryList({ entries }: { entries: UsageEntry[] }) {
  const f = useFormat();
  return (
    <ul className="space-y-1">
      {entries.map((e) => (
        <li key={e.name} className="flex flex-wrap items-center gap-x-2">
          <ItemName name={e.name} icon={e.icon} />
          <span className="font-mono text-xs text-muted-foreground">
            {f.pct(e.share)}%{e.enhance !== undefined && ` · +${e.enhance}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function EndgameGear({ rows, gear, curated }: { rows: EndgameRow[]; gear: RegionGear; curated: { updated: string; sources: { label: string; url: string }[] } }) {
  const t = useTranslations("builds.endgame");
  const f = useFormat();
  const region = useUsageRegion();
  const g = gear[region];
  const showCurated = region === "global";
  return (
    <div className="space-y-3">
      {!showCurated && <p role="note" className="rounded-md border border-border bg-background/40 p-2 text-sm">{t("laterSeason")}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-1 pr-3 font-normal">{t("slot")}</th>
              {showCurated && <th className="py-1 pr-3 font-normal">{t("recommended")}</th>}
              {showCurated && <th className="py-1 pr-3 font-normal">{t("how")}</th>}
              <th className="py-1 font-normal">{t("usage")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const entries = g?.usage.slots[r.slot];
              const hit = findMatch(entries, r.match);
              return (
                <tr key={r.slot} className="border-t border-border/60 align-top">
                  <th scope="row" className="py-2 pr-3 text-left font-normal text-muted-foreground">{r.label}</th>
                  {showCurated && (
                    <td className="py-2 pr-3"><ItemName name={r.item} icon={hit?.icon} /></td>
                  )}
                  {showCurated && (
                    <td className="py-2 pr-3">
                      {r.how}
                      {r.alt && <p className="text-xs text-muted-foreground">{t("alt", { alt: r.alt })}</p>}
                    </td>
                  )}
                  <td className="py-2">
                    {showCurated && g && (hit ? <p>{t("usedBy", { share: f.pct(hit.share) })}</p> : <p className="text-muted-foreground">{t("uncommon")}</p>)}
                    {entries && entries.length > 0 && (showCurated ? (
                      <details>
                        <summary className="inline-flex min-h-11 cursor-pointer items-center text-xs text-primary">{t("mostUsed")}</summary>
                        <EntryList entries={entries} />
                      </details>
                    ) : (
                      <EntryList entries={entries} />
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <footer className="space-y-1 text-xs text-muted-foreground">
        {g && (
          <p>
            {t("source", { date: f.date(g.fetchedAt), sample: f.num(g.usage.sample) })}{" "}
            {g.usage.sourceUrls.map((u, i) => (
              <a key={u} href={u} target="_blank" rel="noreferrer" className="mr-2 inline-flex min-h-11 items-center text-primary underline underline-offset-2">
                {t("sourceLink", { n: i + 1 })}
              </a>
            ))}
          </p>
        )}
        {showCurated && (
          <p>
            {t("curated", { date: f.date(curated.updated) })}{" "}
            {curated.sources.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="mr-2 inline-flex min-h-11 items-center text-primary underline underline-offset-2">
                {s.label}
              </a>
            ))}
          </p>
        )}
      </footer>
    </div>
  );
}

export function TitlesWithShare({ names, gear }: { names: string[]; gear: RegionGear }) {
  const f = useFormat();
  const titles = gear[useUsageRegion()]?.usage.titles ?? [];
  return (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
      {names.map((name, i) => {
        const hit = titles.find((e) => normGear(e.name) === normGear(name));
        return (
          <li key={`${i}-${name}`} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-muted-foreground" aria-hidden>›</span>}
            <span>
              <span>{name}</span>
              {hit && <span className="ml-1 font-mono text-xs text-muted-foreground">{f.pct(hit.share)}%</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function TopUsed({ kind, gear }: { kind: "wings"; gear: RegionGear }) {
  const t = useTranslations("builds.endgame");
  const entries = gear[useUsageRegion()]?.usage[kind] ?? [];
  if (entries.length === 0) return null;
  return (
    <div className="space-y-1">
      <h4 className="text-xs text-muted-foreground">{t("mostUsedNow")}</h4>
      <EntryList entries={entries} />
    </div>
  );
}
