import type { ReactNode } from "react";

/** Título de página con antetítulo en versalitas y una acción opcional a la derecha. */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">{eyebrow}</p>
        <h1 className="mt-1 font-serif text-4xl font-medium tracking-tight">{title}</h1>
        {description && <p className="mt-2 text-sm leading-relaxed text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
