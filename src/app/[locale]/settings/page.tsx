// src/app/[locale]/settings/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegionSelect } from "@/components/settings/region-select";
import { CharactersEditor } from "@/components/settings/characters-editor";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { DataTransfer } from "@/components/settings/data-transfer";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });
  return { title: t("title") };
}

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("settings");
  const section = (title: string, body: React.ReactNode) => (
    <Card>
      <CardHeader><CardTitle className="font-display">{title}</CardTitle></CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
      {section(t("characters.title"), <CharactersEditor />)}
      {section(t("region.title"), <RegionSelect />)}
      {section(t("appearance.title"), <AppearanceSettings />)}
      {section(t("data.title"), <DataTransfer />)}
    </div>
  );
}
