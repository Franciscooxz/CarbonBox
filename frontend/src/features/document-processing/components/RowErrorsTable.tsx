// El backend resume los errores como líneas "Fila 4: amount debe ser mayor que 0" (máx. 20 + "... y N más").
const ROW_ERROR = /^Fila (\d+): (.+)$/;

export function RowErrorsTable({ summary }: { summary: string }) {
  const lines = summary.split("\n").filter(Boolean);
  const rows = lines.flatMap((line) => {
    const match = ROW_ERROR.exec(line);
    return match ? [{ row: match[1], reason: match[2] }] : [];
  });
  const extra = lines.filter((line) => !ROW_ERROR.test(line));

  return (
    <div>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-ink text-left font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            <th className="w-20 py-2 pr-4 font-medium">Fila</th>
            <th className="py-2 font-medium">Motivo del rechazo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((error) => (
            <tr key={error.row} className="border-b border-rule">
              <td className="py-2 pr-4 font-mono text-xs tabular-nums text-failed">{error.row}</td>
              <td className="py-2">{error.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {extra.length > 0 && <p className="mt-2 font-mono text-xs text-ink-muted">{extra.join(" ")}</p>}
    </div>
  );
}
