import { formatNumber, padNumber } from "@/shared/lib/format";
import type { ActivityData } from "../types/upload.types";

const headClass = "py-2 pr-4 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted";

interface CategoryTotal {
  category: string;
  unit: string;
  amount: number;
  count: number;
}

// Se agrupa por categoría Y unidad: sumar kWh con m3 no tendría sentido.
const totalsByCategory = (rows: ActivityData[]): CategoryTotal[] => {
  const totals = new Map<string, CategoryTotal>();
  for (const row of rows) {
    const key = `${row.category}|${row.unit}`;
    const current = totals.get(key) ?? { category: row.category, unit: row.unit, amount: 0, count: 0 };
    current.amount += row.amount;
    current.count += 1;
    totals.set(key, current);
  }
  return [...totals.values()].sort((a, b) => a.category.localeCompare(b.category));
};

export function CategoryTotals({ rows }: { rows: ActivityData[] }) {
  const totals = totalsByCategory(rows);
  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="border-b border-ink text-left">
          <th className={headClass}>Categoría</th>
          <th className={`${headClass} text-right`}>Registros</th>
          <th className={`${headClass} text-right`}>Total</th>
          <th className={`${headClass} pr-0`}>Unidad</th>
        </tr>
      </thead>
      <tbody>
        {totals.map((total) => (
          <tr key={`${total.category}|${total.unit}`} className="border-b border-rule">
            <td className="py-2 pr-4 font-medium">{total.category}</td>
            <td className="py-2 pr-4 text-right font-mono text-xs tabular-nums text-ink-muted">{total.count}</td>
            <td className="py-2 pr-4 text-right font-mono tabular-nums">{formatNumber(total.amount)}</td>
            <td className="py-2 font-mono text-xs text-ink-muted">{total.unit}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ResultsTable({ rows }: { rows: ActivityData[] }) {
  if (rows.length === 0) return <p className="text-sm text-ink-muted">No hay filas procesadas.</p>;

  return (
    <div className="max-h-[32rem] overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-paper">
          <tr className="border-b border-ink text-left">
            <th className={headClass}>N.º</th>
            <th className={headClass}>Fecha</th>
            <th className={headClass}>Categoría</th>
            <th className={`${headClass} text-right`}>Cantidad</th>
            <th className={`${headClass} pr-0`}>Unidad</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            // Las filas no traen id propio en la API; el índice es estable porque la lista no se reordena.
            <tr key={index} className="border-b border-rule hover:bg-paper-sunk/60">
              <td className="py-2 pr-4 font-mono text-xs tabular-nums text-ink-faint">{padNumber(index + 1)}</td>
              {/* La fecha llega como "YYYY-MM-DD" y se muestra tal cual: convertirla a Date la
                  correría un día por la zona horaria del navegador. */}
              <td className="whitespace-nowrap py-2 pr-4 font-mono text-xs tabular-nums text-ink-muted">{row.date}</td>
              <td className="py-2 pr-4">{row.category}</td>
              <td className="py-2 pr-4 text-right font-mono tabular-nums">{formatNumber(row.amount)}</td>
              <td className="py-2 font-mono text-xs text-ink-muted">{row.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
