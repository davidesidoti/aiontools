// src/components/builds/build-section.tsx
export function BuildSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-64 space-y-3 rounded-xl border border-border bg-card p-4">
      <h2 id={`${id}-title`} className="font-display text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function Priority({ items }: { items: string[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
      {items.map((x, i) => (
        <li key={`${i}-${x}`} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-muted-foreground" aria-hidden>›</span>}
          <span>{x}</span>
        </li>
      ))}
    </ol>
  );
}

// A titled, explained sub-group inside a build section, with its own anchor.
export function BuildGroup({ id, title, hint, children }: { id: string; title: string; hint: string; children: React.ReactNode }) {
  return (
    <div id={id} role="group" aria-labelledby={`${id}-title`} className="scroll-mt-64 space-y-2 border-t border-border/60 pt-3">
      <h3 id={`${id}-title`} className="font-medium">{title}</h3>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {children}
    </div>
  );
}
