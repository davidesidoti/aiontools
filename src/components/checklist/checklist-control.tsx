// src/components/checklist/checklist-control.tsx
"use client";
import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export const PIP_LIMIT = 7;

type Props = { activity: string; character: string; count: number; max: number; onChange(count: number): void };

export function ChecklistControl({ activity, character, count, max, onChange }: Props) {
  const t = useTranslations("checklist");
  const label = t("cellLabel", { activity, character, count, max });

  if (max <= PIP_LIMIT) {
    return (
      <div role="group" aria-label={label} className="flex shrink-0">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            aria-label={t("setTo", { activity, character, count: n })}
            aria-pressed={n <= count}
            onClick={() => onChange(count === n ? n - 1 : n)}
            // 28×44 hit area: seven pips must fit a 280px card.
            className="group/pip flex h-11 w-7 items-center justify-center"
          >
            <span
              className={cn(
                "size-3.5 rotate-45 rounded-[3px] border-[1.5px] transition-colors",
                n <= count ? "border-primary bg-primary" : "border-muted-foreground/55 group-hover/pip:border-primary",
              )}
            />
          </button>
        ))}
      </div>
    );
  }

  const done = count >= max;
  return (
    <div role="group" aria-label={label} className="flex shrink-0 items-center gap-1">
      <button type="button" aria-label={t("decrement", { activity, character })} disabled={count === 0} onClick={() => onChange(count - 1)}
        className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30">
        <Minus className="size-3.5" aria-hidden />
      </button>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className="block h-full bg-primary transition-[width] duration-300" style={{ width: `${(count / max) * 100}%` }} />
      </span>
      <span className={cn("min-w-11 text-center font-mono text-xs tabular-nums", done ? "text-primary" : "text-muted-foreground")}>
        {count}/{max}
      </span>
      <button type="button" aria-label={t("increment", { activity, character })} disabled={done} onClick={() => onChange(count + 1)}
        className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30">
        <Plus className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
