// src/components/guides/guide-header.tsx
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function GuideHeader({ page }: { page: "content" | "roadmap" | "tips" | "buffs" | "links" }) {
  const t = await getTranslations("guides");
  return (
    <header className="space-y-2">
      <Link href="/guides" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <h1 className="font-display text-3xl font-bold">{t(`pages.${page}`)}</h1>
      <p className="max-w-prose text-muted-foreground">{t(`descriptions.${page}`)}</p>
    </header>
  );
}
