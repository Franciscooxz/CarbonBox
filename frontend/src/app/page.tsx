import { RecentUploads } from "@/features/document-processing/components/RecentUploads";
import { StatsCards } from "@/features/document-processing/components/StatsCards";
import { ButtonLink } from "@/shared/components/Button";
import { PageHeader } from "@/shared/components/PageHeader";

export default function DashboardPage() {
  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Resumen"
        title="Actividad registrada"
        description="Cada archivo CSV se procesa en segundo plano: la API lo recibe, lo deja en cola y un worker valida y guarda sus filas."
        action={<ButtonLink href="/uploads/new">Subir archivo</ButtonLink>}
      />
      <StatsCards />
      <section>
        <h2 className="mb-3 font-serif text-2xl font-medium">Últimos registros</h2>
        <RecentUploads />
      </section>
    </div>
  );
}
