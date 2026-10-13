// src/components/store-hydrator.tsx
"use client";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useUserStore } from "@/store/user-store";

export function StoreHydrator() {
  const t = useTranslations("settings.data");
  const accent = useUserStore((s) => s.data.settings.accent);
  const hydrated = useUserStore((s) => s.hydrated);

  useEffect(() => {
    const store = useUserStore.getState();
    if (!store.hydrated) store.hydrate();
    if (useUserStore.getState().corrupted) toast.error(t("corrupted"));
    const id = setInterval(() => useUserStore.getState().tickResets(), 60_000);
    return () => clearInterval(id);
  }, [t]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.accent = accent;
  }, [hydrated, accent]);

  return null;
}
