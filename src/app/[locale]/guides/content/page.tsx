// src/app/[locale]/guides/content/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GuideHeader } from "@/components/guides/guide-header";
import { GuideContentView } from "@/components/guides/guide-content-view";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guides" });
  return { title: t("pages.content") };
}

export default async function ContentGuidePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <GuideHeader page="content" />
      <GuideContentView />
    </div>
  );
}
