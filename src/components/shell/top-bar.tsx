// src/components/shell/top-bar.tsx
import { ResetCountdown } from "./reset-countdown";
import { EventCountdown } from "./event-countdown";
import { LocaleSwitch } from "./locale-switch";
import { SyncStatus } from "@/components/sync/sync-status";
import { CommandPalette } from "@/components/command-palette";
import { Link } from "@/i18n/navigation";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-background/90 px-4 h-16 backdrop-blur md:px-8">
      <Link href="/" className="font-display text-lg font-bold text-primary md:hidden">AionTools</Link>
      {/* Phones show resets on Home and in the checklist; the top bar keeps only logo and actions so it fits 375px. */}
      <div className="hidden items-center gap-4 sm:flex">
        <ResetCountdown period="day" />
        <ResetCountdown period="week" />
      </div>
      <div className="hidden items-center gap-4 lg:flex">
        <EventCountdown id="rift" />
        <EventCountdown id="shugo" />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <CommandPalette />
        <SyncStatus />
        <LocaleSwitch />
      </div>
    </header>
  );
}
