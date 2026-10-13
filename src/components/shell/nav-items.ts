// src/components/shell/nav-items.ts
import { BookOpen, Hammer, Home, ListChecks, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", key: "home", icon: Home },
  { href: "/checklist", key: "checklist", icon: ListChecks },
  { href: "/crafting", key: "crafting", icon: Hammer },
  { href: "/guides", key: "guides", icon: BookOpen },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

export function isNavActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
