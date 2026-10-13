// src/components/sync/conflict-dialog.tsx
"use client";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSyncStore } from "@/store/sync-store";

export function ConflictDialog() {
  const t = useTranslations("sync.conflict");
  const open = useSyncStore((s) => s.conflict !== null);
  const resolve = useSyncStore((s) => s.resolveConflict);
  // No onOpenChange: the dialog stays open until one of the two choices is made.
  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="font-display">{t("title")}</DialogTitle>
          <DialogDescription>{t("body")}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="min-h-11" onClick={() => void resolve("overwrite")}>{t("overwrite")}</Button>
          <Button className="min-h-11" onClick={() => void resolve("cloud")}>{t("useCloud")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
