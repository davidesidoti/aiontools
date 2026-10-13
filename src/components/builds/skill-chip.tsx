// src/components/builds/skill-chip.tsx
import { iconFor } from "@/lib/builds";

export function SkillChip({ classId, name, rank, detail }: { classId: string; name: string; rank?: number; detail?: string }) {
  const icon = iconFor(classId, name);
  return (
    <span className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background/40 py-1 pr-3 pl-1">
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element -- fixed 64px game icons
        <img src={icon} alt="" width={36} height={36} className="size-9 rounded-md" loading="lazy" />
      ) : (
        <span className="size-2" aria-hidden />
      )}
      {rank !== undefined && <span className="font-mono text-xs text-primary">{rank}</span>}
      <span className="text-sm">{name}</span>
      {detail && <span className="font-mono text-xs text-muted-foreground">{detail}</span>}
    </span>
  );
}
