"use client";

import Link from "next/link";
import { ErrorMessage } from "@/shared/components/ErrorMessage";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner";
import { getErrorMessage } from "@/shared/lib/api-client";
import { useUploads } from "../api/uploadsApi";
import { EmptyState } from "./UploadList";
import { UploadTable } from "./UploadTable";

const RECENT_COUNT = 5;

// Reutiliza la query de la página 1 de la lista: comparten caché, así que no hay petición extra.
export function RecentUploads() {
  const { data, isPending, error } = useUploads(1);

  if (isPending) return <LoadingSpinner label="Cargando últimos registros" />;
  if (error) return <ErrorMessage title="No se pudieron cargar los registros" message={getErrorMessage(error)} />;
  if (data.total === 0) return <EmptyState />;

  return (
    <div>
      <UploadTable uploads={data.data.slice(0, RECENT_COUNT)} firstEntryNumber={data.total} />
      {data.total > RECENT_COUNT && (
        <Link href="/uploads" className="mt-4 inline-block text-sm text-accent underline decoration-rule underline-offset-4 hover:decoration-accent">
          Ver los {data.total} registros →
        </Link>
      )}
    </div>
  );
}
