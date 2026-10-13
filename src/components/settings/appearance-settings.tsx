// src/components/settings/appearance-settings.tsx
"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/user-store";
import { setSettings } from "@/lib/user-data";

const ACCENTS = ["elyos", "asmodian"] as const;

export function AppearanceSettings() {
  const t = useTranslations("settings.appearance");
  const accent = useUserStore((s) => s.data.settings.accent);
  const update = useUserStore((s) => s.update);
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t("accent")}</p>
      <div role="group" aria-label={t("accent")} className="flex gap-2">
        {ACCENTS.map((a) => (
          <Button key={a} variant={accent === a ? "default" : "outline"} aria-pressed={accent === a} className="min-h-11" onClick={() => update((d) => setSettings(d, { accent: a }))}>
            {t(a)}
          </Button>
        ))}
      </div>
    </div>
  );
}
