// src/app/[locale]/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HomeDashboard } from "@/components/home/home-dashboard";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
      <HomeDashboard />
    </div>
  );
}
