// src/app/[locale]/guides/roadmap/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GuideHeader } from "@/components/guides/guide-header";
import { RoadmapView } from "@/components/guides/roadmap-view";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guides" });
  return { title: t("pages.roadmap") };
}

export default async function RoadmapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <GuideHeader page="roadmap" />
      <RoadmapView />
    </div>
  );
}
