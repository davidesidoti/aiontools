// src/components/shell/footer.tsx
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  return <footer className="px-4 py-6 text-xs text-muted-foreground md:px-8">{t("credits")}</footer>;
}
