// src/components/shell/locale-switch.tsx
"use client";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

export function LocaleSwitch() {
  const t = useTranslations("locale");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const other = routing.locales.find((l) => l !== locale)!;
  return (
    <Button variant="ghost" size="sm" className="min-h-11 min-w-11 uppercase" aria-label={`${t("label")}: ${t(other)}`} onClick={() => router.replace(pathname, { locale: other })}>
      {other}
    </Button>
  );
}
