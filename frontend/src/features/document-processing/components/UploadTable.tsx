import Link from "next/link";
import { formatDateTime, padNumber } from "@/shared/lib/format";
import type { Upload } from "../types/upload.types";
import { StatusBadge } from "./StatusBadge";

/**
 * Tabla presentacional de uploads, compartida por la lista paginada y el resumen.
 * `firstEntryNumber` es el número de asiento de la primera fila (los más recientes tienen el número más alto).
 */
export function UploadTable({ uploads, firstEntryNumber }: { uploads: Upload[]; firstEntryNumber: number }) {
  return (
    // `relative`: el texto sr-only (position: absolute) debe quedar dentro del scroll y no ensanchar la página.
    <div className="relative overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-ink text-left font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            <th className="py-2 pr-4 font-medium">N.º</th>
            <th className="py-2 pr-4 font-medium">Archivo</th>
            <th className="py-2 pr-4 font-medium">Estado</th>
            <th className="py-2 pr-4 font-medium">Recibido</th>
            <th className="py-2 pr-4 text-right font-medium">Filas</th>
            <th className="py-2 text-right font-medium">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {uploads.map((upload, index) => (
            <tr key={upload.id} className="group border-b border-rule transition-colors hover:bg-paper-sunk/60">
              <td className="py-3 pr-4 font-mono text-xs tabular-nums text-ink-faint">
                {padNumber(firstEntryNumber - index)}
              </td>
              <td className="max-w-[16rem] truncate py-3 pr-4 font-medium" title={upload.fileName}>
                {upload.fileName}
              </td>
              <td className="py-3 pr-4">
                <StatusBadge status={upload.status} />
              </td>
              <td className="whitespace-nowrap py-3 pr-4 font-mono text-xs text-ink-muted">
                {formatDateTime(upload.createdAt)}
              </td>
              <td className="whitespace-nowrap py-3 pr-4 text-right font-mono text-xs tabular-nums">
                {upload.totalRows === null ? (
                  <span className="text-ink-faint">—</span>
                ) : (
                  <>
                    {upload.processedRows ?? 0}
                    <span className="text-ink-faint"> / {upload.totalRows}</span>
                    {!!upload.failedRows && (
                      <span className="ml-2 text-failed" title={`${upload.failedRows} filas rechazadas`}>
                        {upload.failedRows} rech.
                      </span>
                    )}
                  </>
                )}
              </td>
              <td className="py-3 text-right">
                <Link
                  href={`/uploads/${upload.id}`}
                  className="whitespace-nowrap text-sm text-accent underline decoration-rule underline-offset-4 group-hover:decoration-accent"
                >
                  Abrir →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
