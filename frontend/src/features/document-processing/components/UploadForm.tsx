"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, type DragEvent, useState } from "react";
import { Button } from "@/shared/components/Button";
import { ErrorMessage } from "@/shared/components/ErrorMessage";
import { getErrorMessage } from "@/shared/lib/api-client";
import { useCreateUpload } from "../api/uploadsApi";

// Debe coincidir con MAX_FILE_SIZE_MB del backend. El backend valida de todas formas;
// esto solo evita esperar a subir 50 MB para enterarse de que no se aceptan.
const MAX_FILE_SIZE_MB = 10;

const validateFile = (file: File): string | null => {
  if (!file.name.toLowerCase().endsWith(".csv")) return "Solo se aceptan archivos .csv";
  if (file.size === 0) return "El archivo está vacío";
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) return `El archivo supera ${MAX_FILE_SIZE_MB} MB`;
  return null;
};

export function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const createUpload = useCreateUpload();

  const selectFile = (selected: File | undefined) => {
    if (!selected) return;
    createUpload.reset();
    const error = validateFile(selected);
    setValidationError(error);
    setFile(error ? null : selected);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files[0]);
  };

  const onSubmit = () => {
    if (!file) return;
    setProgress(0);
    createUpload.mutate(
      { file, onProgress: setProgress },
      { onSuccess: (upload) => router.push(`/uploads/${upload.id}`) },
    );
  };

  const isUploading = createUpload.isPending;

  return (
    <div className="space-y-6">
      <label
        htmlFor="csv-file"
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`block cursor-pointer border-2 border-dashed px-6 py-12 text-center transition-colors ${
          isDragging ? "border-accent bg-completed-wash/50" : "border-rule bg-paper-sunk/50 hover:border-ink-faint"
        } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
      >
        {file ? (
          <>
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">Archivo listo</span>
            <span className="mt-2 block break-all font-serif text-2xl">{file.name}</span>
            <span className="mt-1 block font-mono text-xs text-ink-muted">
              {(file.size / 1024).toFixed(1)} KB · haz clic para cambiarlo
            </span>
          </>
        ) : (
          <>
            <span className="block font-serif text-2xl">
              Suelta aquí tu archivo <span className="italic">.csv</span>
            </span>
            <span className="mt-1 block text-sm text-ink-muted">o haz clic para buscarlo · máximo {MAX_FILE_SIZE_MB} MB</span>
          </>
        )}
        <input
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            selectFile(event.target.files?.[0]);
            // Permite volver a elegir el mismo archivo después de un error.
            event.target.value = "";
          }}
        />
      </label>

      {validationError && <ErrorMessage title="Archivo no válido" message={validationError} />}
      {createUpload.error && (
        <ErrorMessage title="No se pudo subir el archivo" message={getErrorMessage(createUpload.error)} />
      )}

      {isUploading && (
        <div>
          <div className="mb-1.5 flex justify-between font-mono text-xs text-ink-muted">
            <span className="uppercase tracking-[0.14em]">Enviando</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="h-1 bg-rule" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-ink transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <Button type="button" onClick={onSubmit} disabled={!file || isUploading} className="w-full sm:w-auto">
        {isUploading ? "Enviando…" : "Subir y procesar"}
      </Button>
    </div>
  );
}
