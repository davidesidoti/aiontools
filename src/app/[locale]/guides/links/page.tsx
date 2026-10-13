// src/app/[locale]/guides/links/page.tsx
import { ExternalLink } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GuideHeader } from "@/components/guides/guide-header";
import { LINKS } from "@/lib/guides";
import { localize } from "@/lib/activities";
import { className } from "@/lib/classes";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guides" });
  return { title: t("pages.links") };
}

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-primary underline underline-offset-2">
      {children}
      <ExternalLink className="size-3.5" aria-hidden />
    </a>
  );
}

export default async function LinksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("guides.links");
  const L = (x: { en: string; it: string }) => localize(x, locale);
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <GuideHeader page="links" />
      <div className="grid items-start gap-4 sm:grid-cols-2">
        {LINKS.classes.map((c) => (
          <section key={c.classId} className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-display text-lg font-semibold">{className(c.classId)}</h2>
            <h3 className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">{t("guides")}</h3>
            <ul>{c.guides.map((g) => <li key={g.url}><Ext href={g.url}>{L(g.label)}</Ext></li>)}</ul>
            <h3 className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">{t("creators")}</h3>
            {c.creators.length ? (
              <ul className="flex flex-wrap gap-x-4">{c.creators.map((p) => <li key={p.url}><Ext href={p.url}>{p.name}</Ext></li>)}</ul>
            ) : (
              <p className="py-2 text-sm text-muted-foreground">{t("none")}</p>
            )}
          </section>
        ))}
      </div>
      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold">{t("tools")}</h2>
        <ul>{LINKS.tools.map((tool) => <li key={tool.url}><Ext href={tool.url}>{L(tool.label)}</Ext></li>)}</ul>
      </section>
    </div>
  );
}
