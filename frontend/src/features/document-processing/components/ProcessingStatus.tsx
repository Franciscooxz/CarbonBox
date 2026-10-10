import type { Upload } from "../types/upload.types";

export function ProcessingStatus({ upload }: { upload: Upload }) {
  if (upload.status === "PENDING") {
    return (
      <p className="border-l-4 border-pending bg-pending-wash/60 px-4 py-3 text-sm">
        <span className="font-medium text-pending">En cola.</span> El archivo espera a que el worker lo tome; esta
        página se actualiza sola cada 3 segundos.
      </p>
    );
  }

  const total = upload.totalRows;
  const done = (upload.processedRows ?? 0) + (upload.failedRows ?? 0);
  // Mientras el worker no termina de leer el archivo no se conoce el total: barra indeterminada.
  const percent = total ? Math.min(100, Math.round((done / total) * 100)) : null;

  return (
    <div>
      <div className="mb-1.5 flex justify-between font-mono text-xs">
        <span className="uppercase tracking-[0.14em] text-processing">Procesando</span>
        <span className="tabular-nums text-ink-muted">
          {percent === null ? "leyendo archivo…" : `${done} / ${total} filas · ${percent}%`}
        </span>
      </div>
      <div className="h-1 bg-rule" role="progressbar" aria-valuenow={percent ?? undefined} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={`h-full bg-processing transition-all duration-500 ${percent === null ? "w-1/4 animate-pulse" : ""}`}
          style={percent === null ? undefined : { width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
