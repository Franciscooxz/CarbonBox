"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ErrorMessage } from "@/shared/components/ErrorMessage";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner";
import { getErrorMessage } from "@/shared/lib/api-client";
import { formatDateTime } from "@/shared/lib/format";
import { useUpload, useUploadResults } from "../api/uploadsApi";
import { isFinalStatus } from "../types/upload.types";
import { ProcessingStatus } from "./ProcessingStatus";
import { CategoryTotals, ResultsTable } from "./ResultsTable";
import { RowErrorsTable } from "./RowErrorsTable";
import { StatusBadge } from "./StatusBadge";

export function UploadDetail({ id }: { id: string }) {
  const uploadQuery = useUpload(id);
  const upload = uploadQuery.data;
  const resultsQuery = useUploadResults(id, upload?.status === "COMPLETED");

  return (
    <div>
      <Link href="/uploads" className="text-sm text-accent underline decoration-rule underline-offset-4 hover:decoration-accent">
        ← Volver a los registros
      </Link>

      {uploadQuery.isPending && <LoadingSpinner label="Cargando upload" />}
      {uploadQuery.error && (
        <div className="mt-6">
          <ErrorMessage title="No se pudo cargar el upload" message={getErrorMessage(uploadQuery.error)} />
        </div>
      )}

      {upload && (
        <>
          <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                Registro {upload.id.slice(0, 8)}
              </p>
              <h1 className="mt-1 break-all font-serif text-4xl font-medium tracking-tight">{upload.fileName}</h1>
              <p className="mt-2 font-mono text-xs text-ink-muted">Recibido el {formatDateTime(upload.createdAt)}</p>
            </div>
            <StatusBadge status={upload.status} />
          </header>

          <dl className="mt-8 grid grid-cols-3 border-y border-ink">
            <Figure label="Filas en el archivo" value={upload.totalRows} />
            <Figure label="Guardadas" value={upload.processedRows} tone="text-completed" bordered />
            <Figure label="Rechazadas" value={upload.failedRows} tone={upload.failedRows ? "text-failed" : undefined} bordered />
          </dl>

          {!isFinalStatus(upload.status) && (
            <div className="mt-6">
              <ProcessingStatus upload={upload} />
            </div>
          )}

          {upload.status === "FAILED" && (
            <div className="mt-8 space-y-6">
              <ErrorMessage title="El procesamiento falló" message={firstLineOrAll(upload.errorMessage)} />
              {hasRowErrors(upload.errorMessage) && (
                <Section title="Filas rechazadas">
                  <RowErrorsTable summary={upload.errorMessage ?? ""} />
                </Section>
              )}
            </div>
          )}

          {upload.status === "COMPLETED" && (
            <div className="mt-10 space-y-10">
              {resultsQuery.isPending && <LoadingSpinner label="Cargando resultados" />}
              {resultsQuery.error && (
                <ErrorMessage title="No se pudieron cargar los resultados" message={getErrorMessage(resultsQuery.error)} />
              )}
              {resultsQuery.data && (
                <>
                  <Section title="Totales por categoría">
                    <CategoryTotals rows={resultsQuery.data.data} />
                  </Section>
                  <Section title="Detalle de actividad" note={`${resultsQuery.data.data.length} filas`}>
                    <ResultsTable rows={resultsQuery.data.data} />
                  </Section>
                </>
              )}
              {upload.errorMessage && (
                <Section title="Filas rechazadas" note="no se guardaron">
                  <RowErrorsTable summary={upload.errorMessage} />
                </Section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const hasRowErrors = (message: string | null): boolean => !!message && message.startsWith("Fila ");

// Si el FAILED fue por filas, el detalle va en la tabla; aquí basta un resumen.
const firstLineOrAll = (message: string | null): string => {
  if (!message) return "Error desconocido";
  return hasRowErrors(message) ? "Ninguna fila del archivo es válida. Revisa el detalle abajo." : message;
};

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-2xl font-medium">{title}</h2>
        {note && <span className="font-mono text-xs text-ink-muted">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function Figure({ label, value, tone, bordered }: { label: string; value: number | null; tone?: string; bordered?: boolean }) {
  return (
    <div className={`px-4 py-4 ${bordered ? "border-l border-rule" : ""}`}>
      <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">{label}</dt>
      <dd className={`mt-1 font-mono text-3xl font-medium tabular-nums ${tone ?? "text-ink"}`}>{value ?? "—"}</dd>
    </div>
  );
}
