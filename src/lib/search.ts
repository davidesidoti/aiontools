// src/lib/search.ts
import { CONTENT_GUIDE, GUIDE_PAGES, ROADMAP } from "./guides";
import { localize } from "./activities";
import { CLASSES } from "./classes";

export type SearchItem = { id: string; group: "pages" | "classes" | "activities" | "roadmap"; label: string; href: string; keywords: string };

export function buildSearchIndex(locale: string, labels: { nav(key: string): string; guide(key: string): string }): SearchItem[] {
  const page = (id: string, href: string, label: string): SearchItem => ({ id: `page:${id}`, group: "pages", label, href, keywords: "" });
  const pages = [
    page("home", "/", labels.nav("home")),
    page("checklist", "/checklist", labels.nav("checklist")),
    page("builds", "/builds", labels.nav("builds")),
    page("crafting", "/crafting", labels.nav("crafting")),
    page("guides", "/guides", labels.nav("guides")),
    ...GUIDE_PAGES.map((p) => page(`guides-${p}`, `/guides/${p}`, labels.guide(p))),
    page("settings", "/settings", labels.nav("settings")),
  ];
  const activities = CONTENT_GUIDE.map((e): SearchItem => ({
    id: `activity:${e.id}`,
    group: "activities",
    label: e.name,
    href: `/guides/content#${e.id}`,
    keywords: `${localize(e.type, locale)} ${localize(e.where, locale)}`,
  }));
  const roadmap = ROADMAP.phases.map((p): SearchItem => ({
    id: `roadmap:${p.id}`,
    group: "roadmap",
    label: localize(p.title, locale),
    href: `/guides/roadmap#${p.id}`,
    keywords: "",
  }));
  const classes = CLASSES.map((c): SearchItem => ({ id: `class:${c.id}`, group: "classes", label: c.name, href: `/builds/${c.id}`, keywords: "build" }));
  return [...pages, ...classes, ...activities, ...roadmap];
}
