import { UploadForm } from "@/features/document-processing/components/UploadForm";
import { PageHeader } from "@/shared/components/PageHeader";

const COLUMNS = [
  { name: "category", rule: "texto, obligatorio", example: "Electricity" },
  { name: "amount", rule: "número mayor que 0", example: "150.5" },
  { name: "unit", rule: "texto, obligatorio", example: "kWh" },
  { name: "date", rule: "fecha real YYYY-MM-DD", example: "2024-01-15" },
];

export default function NewUploadPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Nuevo registro"
        title="Subir archivo de actividad"
        description="El procesamiento es asíncrono: al terminar la subida te llevamos al detalle para que veas el avance."
      />
      <div className="grid gap-12 lg:grid-cols-[1fr_20rem]">
        <UploadForm />
        <aside>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">Formato esperado</h2>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {COLUMNS.map((column) => (
                <tr key={column.name} className="border-b border-rule align-top">
                  <td className="py-2 pr-3 font-mono text-xs text-accent">{column.name}</td>
                  <td className="py-2 text-ink-muted">
                    {column.rule}
                    <span className="block font-mono text-xs text-ink-faint">{column.example}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs leading-relaxed text-ink-muted">
            Las filas inválidas no detienen el proceso: se guardan las válidas y se informa el motivo de cada rechazo.
          </p>
        </aside>
      </div>
    </div>
  );
}
