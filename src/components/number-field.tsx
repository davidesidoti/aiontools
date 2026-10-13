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
  locale: string;
  suffix?: string;
  className?: string;
};

function separators(locale: string) {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  return {
    group: parts.find((p) => p.type === "group")?.value ?? ",",
    decimal: parts.find((p) => p.type === "decimal")?.value ?? ".",
  };
}

// "150,000" in English and "1.000" in Italian are thousands, not decimals.
export function parseLocaleNumber(text: string, locale: string): number {
  const { group, decimal } = separators(locale);
  const normalized = text.replace(/\s/g, "").split(group).join("").replace(decimal, ".");
  return normalized === "" ? Number.NaN : Number(normalized);
}

// Keeps a draft while typing; commits on blur or Enter only when the number is valid, otherwise snaps back.
export function NumberField({ value, onCommit, min, max = Number.MAX_SAFE_INTEGER, step = 1, label, locale, suffix, className }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = new Intl.NumberFormat(locale, { maximumFractionDigits: 3, useGrouping: "always" }).format(value);
  const commit = () => {
    if (draft === null) return;
    const n = parseLocaleNumber(draft, locale);
    if (Number.isFinite(n) && n >= min && n <= max) onCommit(n);
    setDraft(null);
  };
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Input
        aria-label={label}
        inputMode="decimal"
        step={step}
        value={draft ?? shown}
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
