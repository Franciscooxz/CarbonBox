import type { UploadStatus } from "../types/upload.types";

// Colores pedidos por el enunciado (amarillo, azul, verde, rojo) en la paleta de tinta del sitio.
const STYLES: Record<UploadStatus, { label: string; className: string; dot: string }> = {
  PENDING: { label: "Pendiente", className: "border-pending/40 bg-pending-wash text-pending", dot: "bg-pending" },
  PROCESSING: {
    label: "Procesando",
    className: "border-processing/40 bg-processing-wash text-processing",
    dot: "bg-processing animate-pulse",
  },
  COMPLETED: { label: "Completado", className: "border-completed/40 bg-completed-wash text-completed", dot: "bg-completed" },
  FAILED: { label: "Fallido", className: "border-failed/40 bg-failed-wash text-failed", dot: "bg-failed" },
};

export function StatusBadge({ status }: { status: UploadStatus }) {
  const style = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider ${style.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}
