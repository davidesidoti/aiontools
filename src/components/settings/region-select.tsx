// src/components/settings/region-select.tsx
"use client";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserStore } from "@/store/user-store";
import { setRegion, setSettings } from "@/lib/user-data";
import { REGION_IDS, SERVER_IDS, type RegionId, type ServerId } from "@/lib/regions";

export function RegionSelect() {
  const t = useTranslations("settings.region");
  const region = useUserStore((s) => s.data.settings.region);
  const server = useUserStore((s) => s.data.settings.server);
  const update = useUserStore((s) => s.update);
  return (
    <div className="grid max-w-xs gap-2">
      <Label htmlFor="region">{t("label")}</Label>
      <Select value={region} items={REGION_IDS.map((r) => ({ value: r, label: t(r) }))} onValueChange={(v) => v && update((d) => setRegion(d, v as RegionId, new Date()))}>
        <SelectTrigger id="region" className="min-h-11"><SelectValue /></SelectTrigger>
        <SelectContent>
          {REGION_IDS.map((r) => <SelectItem key={r} value={r}>{t(r)}</SelectItem>)}
        </SelectContent>
      </Select>
      {region === "global" && (
        <>
          <Label htmlFor="server">{t("server")}</Label>
          <Select value={server} items={SERVER_IDS.map((s) => ({ value: s, label: t(`servers.${s}`) }))} onValueChange={(v) => v && update((d) => setSettings(d, { server: v as ServerId }))}>
            <SelectTrigger id="server" className="min-h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SERVER_IDS.map((s) => <SelectItem key={s} value={s}>{t(`servers.${s}`)}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t("serverHint")}</p>
        </>
      )}
    </div>
  );
}
