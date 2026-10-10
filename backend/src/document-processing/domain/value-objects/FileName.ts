import { ValidationError } from '../../../shared/domain/DomainError';
import { type Either, left, right } from '../../../shared/domain/Either';
import { ValueObject } from '../../../shared/domain/ValueObject';

const MAX_LENGTH = 255;

export class FileName extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  static create(raw: string): Either<ValidationError, FileName> {
    const value = raw.trim();
    if (value.length === 0) return left(new ValidationError('El nombre de archivo no puede estar vacío'));
    if (value.length > MAX_LENGTH) {
      return left(new ValidationError(`El nombre de archivo supera ${MAX_LENGTH} caracteres`));
    }
    // Evita path traversal ("../../etc/passwd") si el nombre llega a usarse en rutas.
    if (/[/\\]/.test(value)) return left(new ValidationError('El nombre de archivo no puede contener / ni \\'));
    if (!value.toLowerCase().endsWith('.csv')) return left(new ValidationError('Solo se aceptan archivos .csv'));
    return right(new FileName(value));
  }

  get value(): string {
    return this.props.value;
  }
}
