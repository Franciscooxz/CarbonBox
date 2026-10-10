import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { ValidationError } from '../../../shared/domain/DomainError';
import { type Either, left, right } from '../../../shared/domain/Either';

export const EXPECTED_HEADER = ['category', 'amount', 'unit', 'date'] as const;

export interface ParsedRow {
  rowNumber: number;
  category: string;
  amount: number;
  unit: string;
  date: Date;
}

export interface RowError {
  rowNumber: number;
  message: string;
}

export interface ParsedCsv {
  totalRows: number;
  validRows: ParsedRow[];
  rowErrors: RowError[];
}

const isRealDate = (value: string): boolean => {
  const [year, month, day] = value.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC "corrige" 2024-02-30 a 2024-03-01; si al volver no coincide, la fecha no existe.
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

// .pipe() ejecuta la segunda validación solo si la primera pasó: así "abc" reporta
// "debe ser un número" y no también "debe ser mayor que 0".
const rowSchema = z.object({
  category: z.string().trim().min(1, 'category no puede estar vacío'),
  amount: z
    .string()
    .trim()
    .regex(/^[-+]?\d+(\.\d+)?$/, 'amount debe ser un número')
    .transform(Number)
    .pipe(z.number().positive('amount debe ser mayor que 0')),
  unit: z.string().trim().min(1, 'unit no puede estar vacío'),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date debe tener formato YYYY-MM-DD')
    .pipe(z.string().refine(isRealDate, 'date no es una fecha real'))
    .transform((value) => new Date(`${value}T00:00:00.000Z`)),
});

const normalizeHeader = (cell: string): string => cell.trim().toLowerCase();

export class CsvParserService {
  /**
   * Left solo si el archivo entero es inválido (vacío, ilegible o header incorrecto).
   * Los errores por fila no detienen el proceso: se acumulan en rowErrors.
   */
  parse(content: Buffer): Either<ValidationError, ParsedCsv> {
    let records: string[][];
    try {
      // csv-parse lanza excepciones ante CSV mal formado; aquí se traducen a Either.
      records = parse(content, { bom: true, skip_empty_lines: true, relax_column_count: true });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'error desconocido';
      return left(new ValidationError(`El archivo no es un CSV válido: ${detail}`));
    }

    const [header, ...dataRows] = records;
    if (!header) return left(new ValidationError('El archivo está vacío'));

    const normalized = header.map(normalizeHeader);
    const headerIsValid =
      normalized.length === EXPECTED_HEADER.length && EXPECTED_HEADER.every((col, i) => normalized[i] === col);
    if (!headerIsValid) {
      return left(
        new ValidationError(
          `Header inválido: se esperaba "${EXPECTED_HEADER.join(',')}" y llegó "${header.join(',')}"`,
        ),
      );
    }
    if (dataRows.length === 0) return left(new ValidationError('El archivo no contiene filas de datos'));

    const validRows: ParsedRow[] = [];
    const rowErrors: RowError[] = [];

    dataRows.forEach((cells, index) => {
      // Fila 1 es el header, así que la primera fila de datos es la 2 (como la ve el usuario en Excel).
      const rowNumber = index + 2;
      if (cells.length !== EXPECTED_HEADER.length) {
        rowErrors.push({ rowNumber, message: `se esperaban 4 columnas y hay ${cells.length}` });
        return;
      }
      const [category, amount, unit, date] = cells;
      const result = rowSchema.safeParse({ category, amount, unit, date });
      if (result.success) {
        validRows.push({ rowNumber, ...result.data });
      } else {
        rowErrors.push({ rowNumber, message: result.error.issues.map((issue) => issue.message).join('; ') });
      }
    });

    return right({ totalRows: dataRows.length, validRows, rowErrors });
  }
}
