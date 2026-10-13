// src/app/[locale]/guides/tips/page.tsx
import { ExternalLink } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GuideHeader } from "@/components/guides/guide-header";
import { TIPS } from "@/lib/guides";
import { localize } from "@/lib/activities";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guides" });
  return { title: t("pages.tips") };
}

export default async function TipsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("guides.tips");
  const L = (x: { en: string; it: string }) => localize(x, locale);
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <GuideHeader page="tips" />
      <ol className="space-y-4">
        {TIPS.tips.map((tip, i) => (
          <li key={tip.id} className="flex gap-4 rounded-xl border border-border bg-card p-4">
            <span className="font-display text-2xl font-bold text-primary" aria-hidden>{i + 1}</span>
            <div className="min-w-0 space-y-3">
              <p className="whitespace-pre-line">{L(tip.text)}</p>
              {tip.images && (
                <div className="grid gap-2 sm:grid-cols-3">
                  {tip.images.map((img) => (
                    <a key={img.src} href={img.src} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- screenshots of unknown size */}
                      <img src={img.src} alt={L(img.alt)} loading="lazy" className="w-full rounded-lg border border-border" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">{t("settings")}</h2>
        <p className="text-muted-foreground">{L(TIPS.settings.intro)}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {TIPS.settings.images.map((img) => (
            <a key={img.src} href={img.src} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- screenshots of unknown size */}
              <img src={img.src} alt={L(img.alt)} loading="lazy" className="w-full rounded-lg border border-border" />
            </a>
          ))}
        </div>
      </section>
      {TIPS.links.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-xl font-semibold">{t("more")}</h2>
          <ul className="space-y-1">
            {TIPS.links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-primary underline underline-offset-2">
                  {L(l.label)}
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
