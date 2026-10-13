// src/components/crafting/crafting-tips.tsx
import { Check, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { CRAFTING_TIPS } from "@/lib/crafting";
import { localize } from "@/lib/activities";

export function CraftingTips() {
  const t = useTranslations("crafting.tips");
  const locale = useLocale();
  const L = (x: { en: string; it: string }) => localize(x, locale);
  const card = "rounded-xl border border-border bg-card p-4";
  const h = "mb-3 font-display text-lg font-semibold";
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className={card}>
        <h2 className={h}>{t("base")}</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="text-left font-normal">{t("baseTier")}</th>
              <th className="text-left font-normal">{t("baseItem")}</th>
              <th className="text-right font-normal">{t("baseNeeded")}</th>
            </tr>
          </thead>
          <tbody>
            {CRAFTING_TIPS.base.map((b) => (
              <tr key={b.item} className="border-t border-border/60">
                <th scope="row" className="py-1 text-left font-normal">{L(b.tier)}</th>
                <td>{b.item}</td>
                <td className="text-right font-mono tabular-nums">{b.needed ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className={card}>
        <h2 className={h}>{t("transfer")}</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="text-left font-normal">{t("transferItem")}</th>
              <th className="text-left font-normal">{t("transferResult")}</th>
            </tr>
          </thead>
          <tbody>
            {CRAFTING_TIPS.transfer.map((x) => (
              <tr key={x.item} className="border-t border-border/60">
                <th scope="row" className="py-1 text-left font-normal">{x.item}</th>
                <td className={x.result ? "" : "text-muted-foreground"}>{x.result ?? t("upgradeOnly")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className={card}>
        <h2 className={h}>{t("carryOver")}</h2>
        <ul className="space-y-1 text-sm">
          {CRAFTING_TIPS.carryOver.map((c) => (
            <li key={c.label.en} className="flex items-center justify-between gap-2 border-t border-border/60 py-1">
              <span>{L(c.label)}</span>
              <span className={c.carries ? "flex items-center gap-1 text-primary" : "flex items-center gap-1 text-muted-foreground"}>
                {c.carries ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
                {c.carries ? t("carries") : t("lost")}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className={card}>
        <h2 className={h}>{t("misc")}</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          {CRAFTING_TIPS.misc.map((m) => <li key={m.en}>{L(m)}</li>)}
        </ul>
      </section>
      {CRAFTING_TIPS.images.length > 0 && (
        <section className={`${card} lg:col-span-2`}>
          <h2 className={h}>{t("compare")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {CRAFTING_TIPS.images.map((img) => (
              <figure key={img.src} className="space-y-1">
                <a href={img.src} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- screenshots of unknown size */}
                  <img src={img.src} alt={L(img.label)} loading="lazy" className="w-full rounded-lg border border-border" />
                </a>
                <figcaption className="text-sm text-muted-foreground">{L(img.label)}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
