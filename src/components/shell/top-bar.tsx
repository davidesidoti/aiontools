// src/components/shell/top-bar.tsx
import { ResetCountdown } from "./reset-countdown";
import { LocaleSwitch } from "./locale-switch";
import { SyncStatus } from "@/components/sync/sync-status";
import { CommandPalette } from "@/components/command-palette";
import { Link } from "@/i18n/navigation";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-background/90 px-4 py-2 backdrop-blur md:px-8">
      <Link href="/" className="font-display text-lg font-bold text-primary md:hidden">AionTools</Link>
      <div className="flex items-center gap-4">
        <ResetCountdown period="day" />
        <ResetCountdown period="week" />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <CommandPalette />
        <SyncStatus />
        <LocaleSwitch />
      </div>
    </header>
  );
}
