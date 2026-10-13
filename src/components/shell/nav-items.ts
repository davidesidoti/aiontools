// src/components/shell/nav-items.ts
import { Home, ListChecks, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", key: "home", icon: Home },
  { href: "/checklist", key: "checklist", icon: ListChecks },
  { href: "/settings", key: "settings", icon: Settings },
] as const;
