import { InvalidStateError, NotFoundError } from '../../../shared/domain/DomainError';
import type { UploadStatus } from '../value-objects/UploadStatus';

export class UploadNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`No existe el upload ${id}`);
  }
}

export class InvalidUploadTransitionError extends InvalidStateError {
  constructor(from: UploadStatus, to: UploadStatus) {
    super(`Transición inválida: ${from.value} → ${to.value}`);
  }
}
