// src/app/[locale]/checklist/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChecklistView } from "@/components/checklist/checklist-view";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checklist" });
  return { title: t("title") };
}

export default async function ChecklistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("checklist");
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
      <ChecklistView />
    </div>
  );
}
