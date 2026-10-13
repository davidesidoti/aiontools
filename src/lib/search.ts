// src/lib/search.ts
import { CONTENT_GUIDE, GUIDE_PAGES, ROADMAP } from "./guides";
import { localize } from "./activities";
import { CLASSES } from "./classes";

export type SearchItem = { id: string; group: "pages" | "classes" | "activities" | "roadmap"; label: string; href: string; keywords: string; value: string };
type Draft = Omit<SearchItem, "value">;

export function buildSearchIndex(locale: string, labels: { nav(key: string): string; guide(key: string): string }): SearchItem[] {
  const page = (id: string, href: string, label: string): Draft => ({ id: `page:${id}`, group: "pages", label, href, keywords: "" });
  const pages = [
    page("home", "/", labels.nav("home")),
    page("checklist", "/checklist", labels.nav("checklist")),
    page("builds", "/builds", labels.nav("builds")),
    page("crafting", "/crafting", labels.nav("crafting")),
    page("guides", "/guides", labels.nav("guides")),
    ...GUIDE_PAGES.map((p) => page(`guides-${p}`, `/guides/${p}`, labels.guide(p))),
    page("settings", "/settings", labels.nav("settings")),
  ];
  const activities = CONTENT_GUIDE.map((e): Draft => ({
    id: `activity:${e.id}`,
    group: "activities",
    label: e.name,
    href: `/guides/content#${e.id}`,
    keywords: `${localize(e.type, locale)} ${localize(e.where, locale)}`,
  }));
  const roadmap = ROADMAP.phases.map((p): Draft => ({
    id: `roadmap:${p.id}`,
    group: "roadmap",
    label: localize(p.title, locale),
    href: `/guides/roadmap#${p.id}`,
    keywords: "",
  }));
  const classes = CLASSES.map((c): Draft => ({ id: `class:${c.id}`, group: "classes", label: c.name, href: `/builds/${c.id}`, keywords: "build" }));
  const all = [...pages, ...classes, ...activities, ...roadmap];
  // cmdk matches on `value`, which must be unique: label + keywords, disambiguated by group if needed.
  const seen = new Set<string>();
  return all.map((item) => {
    let value = `${item.label} ${item.keywords}`.trim();
    if (seen.has(value)) value = `${value} (${item.group})`;
    seen.add(value);
    return { ...item, value };
  });
}
