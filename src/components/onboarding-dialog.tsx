// src/components/onboarding-dialog.tsx
"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/user-store";
import { setSettings } from "@/lib/user-data";
import { RegionSelect } from "@/components/settings/region-select";
import { CharactersEditor } from "@/components/settings/characters-editor";

export function OnboardingDialog() {
  const t = useTranslations("onboarding");
  const open = useUserStore((s) => s.hydrated && !s.data.settings.onboarded);
  const update = useUserStore((s) => s.update);
  const [step, setStep] = useState<0 | 1>(0);
  const finish = () => update((d) => setSettings(d, { onboarded: true }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && finish()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t("title")}</DialogTitle>
          <DialogDescription>{step === 0 ? t("regionStep") : t("charactersStep")}</DialogDescription>
        </DialogHeader>
        {step === 0 ? <RegionSelect /> : <CharactersEditor />}
        <DialogFooter className="gap-2">
          <Button variant="ghost" className="min-h-11" onClick={finish}>{t("skip")}</Button>
          {step === 0 ? (
            <Button className="min-h-11" onClick={() => setStep(1)}>{t("next")}</Button>
          ) : (
            <Button className="min-h-11" onClick={finish}>{t("done")}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
