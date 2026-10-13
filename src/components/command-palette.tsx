// src/components/command-palette.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { buildSearchIndex, type SearchItem } from "@/lib/search";
import { Button } from "@/components/ui/button";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const GROUPS: SearchItem["group"][] = ["pages", "activities", "roadmap"];

export function CommandPalette() {
  const t = useTranslations("palette");
  const tNav = useTranslations("nav");
  const tGuide = useTranslations("guides.pages");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const items = useMemo(() => buildSearchIndex(locale, { nav: (k) => tNav(k), guide: (k) => tGuide(k) }), [locale, tNav, tGuide]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuery("");
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    const [path, hash] = href.split("#");
    // Same page: change only the hash so the page opens the entry without a navigation.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- hash-only, no navigation
    if (hash && path === pathname) window.location.assign(`#${hash}`);
    else router.push(href);
  };

  return (
    <>
      <Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label={t("open")} onClick={() => {
          setQuery("");
          setOpen(true);
        }}>
        <Search className="size-4" aria-hidden />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title={t("title")} description={t("description")}>
        <Command>
        <CommandInput placeholder={t("placeholder")} value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>{t("empty")}</CommandEmpty>
          {GROUPS.map((g) => (
            <CommandGroup key={g} heading={t(`groups.${g}`)}>
              {items.filter((i) => i.group === g).map((i) => (
                <CommandItem key={i.id} value={`${i.label} ${i.keywords} ${i.id}`} onSelect={() => go(i.href)}>
                  {i.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
