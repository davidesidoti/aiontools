// src/app/[locale]/crafting/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CraftingCalculator } from "@/components/crafting/crafting-calculator";
import { CraftingTips } from "@/components/crafting/crafting-tips";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "crafting" });
  return { title: t("title") };
}

export default async function CraftingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("crafting");
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
        <p className="max-w-prose text-muted-foreground">{t("intro")}</p>
      </header>
      <Tabs defaultValue="calculator" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calculator" className="min-h-11">{t("tabs.calculator")}</TabsTrigger>
          <TabsTrigger value="tips" className="min-h-11">{t("tabs.tips")}</TabsTrigger>
        </TabsList>
        <TabsContent value="calculator"><CraftingCalculator /></TabsContent>
        <TabsContent value="tips"><CraftingTips /></TabsContent>
      </Tabs>
    </div>
  );
}
