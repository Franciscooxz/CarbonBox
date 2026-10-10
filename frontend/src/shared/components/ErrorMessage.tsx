export function ErrorMessage({ title = "Algo salió mal", message }: { title?: string; message: string }) {
  return (
    <div role="alert" className="border-l-4 border-failed bg-failed-wash/60 px-4 py-3 text-sm">
      <p className="font-serif text-base font-semibold text-failed">{title}</p>
      <p className="mt-1 whitespace-pre-line text-ink">{message}</p>
    </div>
  );
}
