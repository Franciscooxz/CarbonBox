"use client";

import { ErrorMessage } from "@/shared/components/ErrorMessage";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner";
import { getErrorMessage } from "@/shared/lib/api-client";
import { padNumber } from "@/shared/lib/format";
import { useUploadStats } from "../api/uploadsApi";

export function StatsCards() {
  const { data, isPending, error } = useUploadStats();

  if (isPending) return <LoadingSpinner label="Cargando resumen" />;
  if (error) return <ErrorMessage title="No se pudo cargar el resumen" message={getErrorMessage(error)} />;

  const figures = [
    { label: "Archivos recibidos", value: data.total, tone: "text-ink" },
    { label: "Completados", value: data.completed, tone: "text-completed" },
    // "En curso" incluye PENDING: para el usuario ambos significan "todavía no terminó".
    { label: "En curso", value: data.pending + data.processing, tone: "text-processing" },
    { label: "Fallidos", value: data.failed, tone: "text-failed" },
  ];

  return (
    <dl className="grid grid-cols-2 border-y border-ink md:grid-cols-4">
      {figures.map((figure, index) => (
        <div
          key={figure.label}
          className={`px-4 py-5 ${index % 2 === 1 ? "border-l border-rule" : ""} ${index >= 2 ? "border-t border-rule md:border-t-0" : ""} ${index === 2 ? "md:border-l" : ""}`}
        >
          <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">{figure.label}</dt>
          <dd className={`mt-2 font-mono text-4xl font-medium tabular-nums ${figure.tone}`}>{padNumber(figure.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
