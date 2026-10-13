// src/components/shell/bottom-nav.tsx
"use client";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NAV_ITEMS, isNavActive, navAriaCurrent } from "./nav-items";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")} className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-border bg-card/95 backdrop-blur md:hidden">
      {NAV_ITEMS.map(({ href, key, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          aria-current={navAriaCurrent(pathname, href)}
          className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground", isNavActive(pathname, href) && "text-primary")}
        >
          <Icon className="size-5" aria-hidden />
          {t.has(`short.${key}`) ? t(`short.${key}`) : t(key)}
        </Link>
      ))}
    </nav>
  );
}
