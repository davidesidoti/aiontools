// src/components/command-palette.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { buildSearchIndex, type SearchItem } from "@/lib/search";
import { Button } from "@/components/ui/button";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const GROUPS: SearchItem["group"][] = ["pages", "classes", "activities", "roadmap"];

export function CommandPalette() {
  const t = useTranslations("palette");
  const tNav = useTranslations("nav");
  const tGuide = useTranslations("guides.pages");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
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

  // While open, a printable key pressed outside the input moves focus there first, so the character lands in the search.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const input = inputRef.current;
      if (!input || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1 || document.activeElement === input) return;
      input.focus();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    const [path, hash] = href.split("#");
    // Same page: change only the hash so the page opens the entry without a navigation.
    if (hash && path === pathname) {
      // Same hash again: no hashchange would fire, so announce the jump ourselves.
      if (window.location.hash === `#${hash}`) window.dispatchEvent(new HashChangeEvent("hashchange"));
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- hash-only, no navigation
      else window.location.assign(`#${hash}`);
    } else router.push(href);
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
        <CommandInput ref={inputRef} placeholder={t("placeholder")} value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>{t("empty")}</CommandEmpty>
          {GROUPS.map((g) => (
            <CommandGroup key={g} heading={t(`groups.${g}`)}>
              {items.filter((i) => i.group === g).map((i) => (
                <CommandItem key={i.id} value={i.value} onSelect={() => go(i.href)}>
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
