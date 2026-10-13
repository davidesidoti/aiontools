// src/components/shell/sidebar.tsx
"use client";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NAV_ITEMS, isNavActive } from "./nav-items";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-border bg-card/40 p-4 md:flex">
      <Link href="/" className="font-display text-xl font-bold tracking-wide text-primary">AionTools</Link>
      <nav aria-label={t("label")} className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, key, icon: Icon }) => (
          <Link
            key={key}
            href={href}
            aria-current={isNavActive(pathname, href) ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              isNavActive(pathname, href) && "bg-accent text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {t(key)}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
