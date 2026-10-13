// src/components/shell/nav-items.ts
import { BookOpen, Hammer, Home, ListChecks, Settings, Swords } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", key: "home", icon: Home },
  { href: "/checklist", key: "checklist", icon: ListChecks },
  { href: "/builds", key: "builds", icon: Swords },
  { href: "/crafting", key: "crafting", icon: Hammer },
  { href: "/guides", key: "guides", icon: BookOpen },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

export function isNavActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

// "page" only on the exact page; a parent section gets "true" (WAI-ARIA), so screen readers don't announce two current pages.
export function navAriaCurrent(pathname: string, href: string): "page" | "true" | undefined {
  if (pathname === href) return "page";
  return isNavActive(pathname, href) ? "true" : undefined;
}
