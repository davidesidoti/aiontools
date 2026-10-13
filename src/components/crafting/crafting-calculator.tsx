// src/components/crafting/crafting-calculator.tsx
"use client";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useUserStore } from "@/store/user-store";
import { CRAFTING, computeCrafting, resetCrafting, setCraftingPrice, setCraftingRate, setCraftingTax } from "@/lib/crafting";
import { localize } from "@/lib/activities";
import { NumberField } from "@/components/number-field";
import { Button } from "@/components/ui/button";

const percent = (x: number) => Math.round(x * 1000) / 10;

export function CraftingCalculator() {
  const t = useTranslations("crafting");
  const locale = useLocale();
  const overrides = useUserStore((s) => s.data.crafting);
  const hydrated = useUserStore((s) => s.hydrated);
  const update = useUserStore((s) => s.update);
  if (!hydrated) return <div className="h-96 animate-pulse rounded-xl bg-card" />;

  const kina = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const dec = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const r = computeCrafting(CRAFTING, overrides);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-4">
        {r.tiers.map((tier) => {
          const name = localize(tier.name, locale);
          return (
            <section key={tier.id} aria-labelledby={`tier-${tier.id}`} className="rounded-xl border border-border bg-card p-4">
              <header className="mb-3 flex flex-wrap items-baseline gap-x-3">
                <h2 id={`tier-${tier.id}`} className="font-display text-lg font-semibold">{name}</h2>
                <span className="text-xs text-muted-foreground">{t("baseCrafts", { count: tier.crafts })}</span>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="py-1 text-left font-normal">{t("material")}</th>
                      <th className="py-1 text-right font-normal">{t("qty")}</th>
                      <th className="py-1 text-right font-normal">{t("unitPrice")}</th>
                      <th className="py-1 text-right font-normal">{t("costPerCraft")}</th>
                      <th className="py-1 text-right font-normal">{t("expectedTotal")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tier.materials.map((m) => (
                      <tr key={m.id} className="border-t border-border/60">
                        <th scope="row" className="py-1 pr-2 text-left font-normal">{m.name}</th>
                        <td className="text-right font-mono tabular-nums">{m.qty}</td>
                        <td className="py-1 text-right">
                          <NumberField locale={locale} label={t("priceLabel", { material: m.name })} value={m.price} min={0} onCommit={(v) => update((d) => setCraftingPrice(d, m.id, v))} />
                        </td>
                        <td className="text-right font-mono tabular-nums">{kina.format(m.cost)}</td>
                        <td className="text-right font-mono tabular-nums">{kina.format(m.expected)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <footer className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-3 text-sm">
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t("successRate")}</span>
                  <NumberField locale={locale} label={t("rateLabel", { tier: name })} value={percent(tier.rate)} min={0.1} max={100} step={0.1} suffix="%"
                    onCommit={(v) => update((d) => setCraftingRate(d, tier.id, v / 100))} />
                </span>
                <span>
                  <span className="text-muted-foreground">{t("expectedCrafts")}</span>{" "}
                  <span className="font-mono tabular-nums">{dec.format(tier.expectedCrafts)}</span>
                </span>
                <span className="ml-auto">
                  <span className="text-muted-foreground">{t("tierTotal")}</span>{" "}
                  <span className="font-mono tabular-nums text-primary">{kina.format(tier.total)}</span>
                </span>
              </footer>
            </section>
          );
        })}
      </div>

      <aside aria-labelledby="crafting-summary" className="space-y-3 rounded-xl border border-border bg-card p-4 lg:sticky lg:top-20">
        <h2 id="crafting-summary" className="font-display text-lg font-semibold">{t("summary")}</h2>
        <dl className="space-y-1 text-sm">
          {r.tiers.map((tier) => (
            <div key={tier.id} className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{localize(tier.name, locale)}</dt>
              <dd className="font-mono tabular-nums">{kina.format(tier.total)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-2 border-t border-border pt-1">
            <dt>{t("subtotal")}</dt>
            <dd className="font-mono tabular-nums">{kina.format(r.subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt>{t("tax")}</dt>
            <dd>
              <NumberField locale={locale} label={t("taxLabel")} value={percent(r.tax)} min={0} max={100} step={0.1} suffix="%" onCommit={(v) => update((d) => setCraftingTax(d, v / 100))} />
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{t("taxAmount")}</dt>
            <dd className="font-mono tabular-nums">{kina.format(r.taxAmount)}</dd>
          </div>
        </dl>
        <div className="border-t border-border pt-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("total")}</p>
          <p data-testid="crafting-total" className="font-mono text-3xl tabular-nums text-primary">{kina.format(r.total)}</p>
        </div>
        <Button variant="outline" className="min-h-11 w-full" onClick={() => { update(resetCrafting); toast.success(t("resetDone")); }}>
          {t("reset")}
        </Button>
      </aside>
    </div>
  );
}
