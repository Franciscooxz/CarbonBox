import { ValidationError } from '../../../shared/domain/DomainError';
import { type Either, left, right } from '../../../shared/domain/Either';
import { ValueObject } from '../../../shared/domain/ValueObject';

export const UPLOAD_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] as const;
export type UploadStatusValue = (typeof UPLOAD_STATUSES)[number];

// Transiciones válidas. PROCESSING → PROCESSING es la reanudación de un reintento (ADR-003).
const ALLOWED_TRANSITIONS: Record<UploadStatusValue, readonly UploadStatusValue[]> = {
  PENDING: ['PROCESSING', 'FAILED'],
  PROCESSING: ['PROCESSING', 'COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: [],
};

export class UploadStatus extends ValueObject<{ value: UploadStatusValue }> {
  static readonly PENDING = new UploadStatus('PENDING');
  static readonly PROCESSING = new UploadStatus('PROCESSING');
  static readonly COMPLETED = new UploadStatus('COMPLETED');
  static readonly FAILED = new UploadStatus('FAILED');

  private constructor(value: UploadStatusValue) {
    super({ value });
  }

  static create(value: string): Either<ValidationError, UploadStatus> {
    if (!(UPLOAD_STATUSES as readonly string[]).includes(value)) {
      return left(new ValidationError(`Estado de upload inválido: ${value}`));
    }
    return right(new UploadStatus(value as UploadStatusValue));
  }

  get value(): UploadStatusValue {
    return this.props.value;
  }

  isFinal(): boolean {
    return this.value === 'COMPLETED' || this.value === 'FAILED';
  }

  canTransitionTo(next: UploadStatus): boolean {
    return ALLOWED_TRANSITIONS[this.value].includes(next.value);
  }
}
