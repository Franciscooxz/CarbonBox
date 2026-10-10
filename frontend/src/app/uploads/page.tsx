import { UploadList } from "@/features/document-processing/components/UploadList";
import { ButtonLink } from "@/shared/components/Button";
import { PageHeader } from "@/shared/components/PageHeader";

const parsePage = (raw: string | undefined): number => {
  const page = Number(raw);
  return Number.isInteger(page) && page >= 1 ? page : 1;
};

// Next.js 15: searchParams llega como Promise en los Server Components.
export default async function UploadsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;

  return (
    <div>
      <PageHeader
        eyebrow="Registros"
        title="Archivos recibidos"
        description="La tabla se actualiza sola mientras haya archivos en curso."
        action={<ButtonLink href="/uploads/new">Subir archivo</ButtonLink>}
      />
      <UploadList page={parsePage(page)} />
    </div>
  );
}
