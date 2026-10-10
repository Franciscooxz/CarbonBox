"use client";

import Link from "next/link";
import { ErrorMessage } from "@/shared/components/ErrorMessage";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner";
import { getErrorMessage } from "@/shared/lib/api-client";
import { PAGE_SIZE, useUploads } from "../api/uploadsApi";
import { UploadTable } from "./UploadTable";

export function UploadList({ page }: { page: number }) {
  const { data, isPending, error, isPlaceholderData } = useUploads(page);

  if (isPending) return <LoadingSpinner label="Cargando registros" />;
  if (error) return <ErrorMessage title="No se pudo cargar la lista" message={getErrorMessage(error)} />;
  if (data.total === 0) return <EmptyState />;

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div className={isPlaceholderData ? "opacity-60 transition-opacity" : ""}>
      <UploadTable uploads={data.data} firstEntryNumber={data.total - (page - 1) * PAGE_SIZE} />

      <nav className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Paginación">
        <p className="font-mono text-xs text-ink-muted">
          {data.total} registros · página {page} de {totalPages}
        </p>
        <div className="flex gap-5">
          <PageLink page={page - 1} disabled={page <= 1}>
            ← Anterior
          </PageLink>
          <PageLink page={page + 1} disabled={page >= totalPages}>
            Siguiente →
          </PageLink>
        </div>
      </nav>
    </div>
  );
}

function PageLink({ page, disabled, children }: { page: number; disabled: boolean; children: string }) {
  if (disabled) return <span className="cursor-not-allowed text-ink-faint">{children}</span>;
  // La página vive en la URL: el botón "atrás" del navegador y los enlaces compartidos funcionan.
  return (
    <Link href={`/uploads?page=${page}`} className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent">
      {children}
    </Link>
  );
}

export function EmptyState() {
  return (
    <div className="border-y border-dashed border-rule py-14 text-center">
      <p className="font-serif text-xl italic text-ink-muted">El registro está vacío.</p>
      <Link href="/uploads/new" className="mt-3 inline-block text-sm text-accent underline underline-offset-4">
        Subir el primer archivo CSV
      </Link>
    </div>
  );
}
