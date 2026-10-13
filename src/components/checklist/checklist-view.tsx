// src/components/checklist/checklist-view.tsx
"use client";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/user-store";
import { CharacterCard } from "./character-card";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";

export function ChecklistView() {
  const t = useTranslations("checklist");
  const hydrated = useUserStore((s) => s.hydrated);
  const ids = useUserStore((s) => s.data.characters.map((c) => c.id).join(","));

  if (!hydrated) return <div className="h-64 animate-pulse rounded-xl bg-card" />;
  if (!ids) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="mb-4 text-muted-foreground">{t("noCharacters")}</p>
        <Link href="/settings" className={buttonVariants()}>{t("goToSettings")}</Link>
      </div>
    );
  }
  return (
    <div className="grid items-start gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
      {ids.split(",").map((id) => <CharacterCard key={id} characterId={id} />)}
    </div>
  );
}
