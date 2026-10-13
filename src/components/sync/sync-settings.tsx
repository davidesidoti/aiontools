// src/components/sync/sync-settings.tsx
"use client";
import { useState } from "react";
import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSyncStore } from "@/store/sync-store";

export function SyncSettings() {
  const t = useTranslations("sync");
  const { code, error, createCode, connect, disconnect, deleteCloud } = useSyncStore();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  const errorText = error && <p role="alert" className="text-sm text-destructive">{t(`errors.${error}`)}</p>;

  if (!code) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("hint")}</p>
        <Button className="min-h-11" disabled={busy} onClick={() => run(createCode)}>{t("create")}</Button>
        <form
          className="space-y-2 border-t border-border pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              if (await connect(input)) setInput("");
            });
          }}
        >
          <Label htmlFor="sync-code">{t("codeLabel")}</Label>
          <div className="flex flex-wrap gap-2">
            <Input id="sync-code" value={input} onChange={(e) => setInput(e.target.value)} placeholder="wolf-amber-river-7421"
              autoComplete="off" spellCheck={false} className="min-h-11 w-64 font-mono" />
            <Button type="submit" variant="outline" className="min-h-11" disabled={busy || !input.trim()}>{t("connect")}</Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("connectHint")}</p>
        </form>
        {errorText}
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(t("copied"));
    } catch {
      // Clipboard blocked: the code stays on screen, selectable, to copy by hand.
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">{t("yourCode")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <code data-testid="sync-code" className="rounded-md bg-muted px-3 py-2 font-mono text-sm select-all">{code}</code>
          <Button variant="ghost" size="sm" className="min-h-11" onClick={copy}>
            <Copy className="size-4" aria-hidden />
            {t("copy")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("hint")}</p>
      </div>
      {errorText}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="min-h-11" onClick={disconnect}>{t("disconnect")}</Button>
        <Button
          variant="destructive"
          className="min-h-11"
          disabled={busy}
          onClick={() => (confirmDelete ? run(deleteCloud).then(() => setConfirmDelete(false)) : setConfirmDelete(true))}
        >
          {confirmDelete ? t("deleteConfirm") : t("delete")}
        </Button>
      </div>
    </div>
  );
}
