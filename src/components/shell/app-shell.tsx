// src/components/shell/app-shell.tsx
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { TopBar } from "./top-bar";
import { Footer } from "./footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[14rem_1fr]">
      <Sidebar />
      <div className="flex min-h-dvh min-w-0 flex-col">
        <TopBar />
        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">{children}</main>
        <Footer />
      </div>
      <BottomNav />
    </div>
  );
}
