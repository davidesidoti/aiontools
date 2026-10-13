// src/app/[locale]/builds/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BUILD_IDS, BUILDS, classIcon } from "@/lib/builds";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "builds" });
  return { title: t("title") };
}

export default async function BuildsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("builds");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </header>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {BUILD_IDS.map((id) => (
          <li key={id}>
            <Link href={`/builds/${id}`} className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/60">
              {/* eslint-disable-next-line @next/next/no-img-element -- small class emblems */}
              <img src={classIcon(id)} alt="" width={72} height={72} className="size-18" />
              <span className="font-display text-lg font-semibold">{BUILDS[id].name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
