export function LoadingSpinner({ label = "Cargando" }: { label?: string }) {
  return (
    <p role="status" className="py-10 font-mono text-xs uppercase tracking-[0.16em] text-ink-muted">
      {label}
      <span className="ml-1 inline-block animate-pulse">…</span>
    </p>
  );
}
