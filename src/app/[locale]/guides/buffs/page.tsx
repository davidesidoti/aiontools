// src/app/[locale]/guides/buffs/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GuideHeader } from "@/components/guides/guide-header";
import { BUFFS } from "@/lib/guides";
import { localize } from "@/lib/activities";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guides" });
  return { title: t("pages.buffs") };
}

type Buff = NonNullable<(typeof BUFFS.pairs)[number]["chanter"]>;

export default async function BuffsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("guides.buffs");
  const L = (x: { en: string; it: string }) => localize(x, locale);
  const card = "rounded-xl border border-border bg-card p-4";
  const BuffCard = ({ buff }: { buff: Buff | null }) =>
    buff ? (
      <div className={card}>
        <h3 className="font-semibold">{buff.name}</h3>
        {buff.detail && <p className="text-xs text-muted-foreground">{L(buff.detail)}</p>}
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">{buff.effects.map((e) => <li key={e.en}>{L(e)}</li>)}</ul>
      </div>
    ) : (
      <div aria-hidden />
    );
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <GuideHeader page="buffs" />
      <p className="rounded-xl border border-primary/50 bg-primary/10 p-4 text-sm">{L(BUFFS.intro)}</p>
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">{t("differences")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["chanter", "cleric"] as const).map((c) => (
            <div key={c} className={card}>
              <h3 className="font-display text-lg font-semibold">{t(c)}</h3>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">{BUFFS.differences[c].map((d) => <li key={d.en}>{L(d)}</li>)}</ul>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{t("comp")}: </span>{L(BUFFS.comp)}</p>
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">{t("pairs")}</h2>
        <div className="hidden grid-cols-2 gap-4 text-sm text-muted-foreground sm:grid">
          <span>{t("chanter")}</span>
          <span>{t("cleric")}</span>
        </div>
        {BUFFS.pairs.map((pair, i) => (
          <div key={i} className="grid gap-4 sm:grid-cols-2">
            <BuffCard buff={pair.chanter} />
            <BuffCard buff={pair.cleric} />
          </div>
        ))}
      </section>
    </div>
  );
}
