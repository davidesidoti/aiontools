// src/components/settings/region-select.tsx
"use client";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserStore } from "@/store/user-store";
import { setRegion } from "@/lib/user-data";
import { REGION_IDS, type RegionId } from "@/lib/regions";

export function RegionSelect() {
  const t = useTranslations("settings.region");
  const region = useUserStore((s) => s.data.settings.region);
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
    </div>
  );
}
