// src/components/number-field.tsx
"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onCommit(value: number): void;
  min: number;
  max?: number;
  step?: number;
  label: string;
  suffix?: string;
  className?: string;
};

// Keeps a draft while typing; commits on blur or Enter only when the number is valid, otherwise snaps back.
export function NumberField({ value, onCommit, min, max = Number.MAX_SAFE_INTEGER, step = 1, label, suffix, className }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const text = draft.replace(/\s/g, "").replace(",", ".");
    const n = Number(text);
    if (text !== "" && Number.isFinite(n) && n >= min && n <= max) onCommit(n);
    setDraft(null);
  };
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Input
        aria-label={label}
        inputMode="decimal"
        step={step}
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="min-h-11 w-28 text-right font-mono tabular-nums"
      />
      {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
    </span>
  );
}
