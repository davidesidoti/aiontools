// src/app/[locale]/guides/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GUIDE_PAGES } from "@/lib/guides";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guides" });
  return { title: t("title") };
}

export default async function GuidesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("guides");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {GUIDE_PAGES.map((p) => (
          <li key={p}>
            <Link href={`/guides/${p}`} className="block h-full rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/60">
              <h2 className="font-display text-lg font-semibold">{t(`pages.${p}`)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t(`descriptions.${p}`)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
