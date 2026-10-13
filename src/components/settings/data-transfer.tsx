// src/components/settings/data-transfer.tsx
"use client";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/user-store";
import { parseImported } from "@/lib/user-data";

export function DataTransfer() {
  const t = useTranslations("settings.data");
  const fileRef = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(useUserStore.getState().data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `aiontools-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (file: File) => {
    const data = parseImported(await file.text());
    if (!data) return toast.error(t("importError"));
    useUserStore.getState().update(() => data);
    useUserStore.getState().tickResets();
    toast.success(t("importDone"));
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="min-h-11" onClick={exportData}>{t("export")}</Button>
        <Button variant="outline" className="min-h-11" onClick={() => fileRef.current?.click()}>{t("import")}</Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importData(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
