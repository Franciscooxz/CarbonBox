// El "tipo" decide el código HTTP en el error handler central; el dominio no sabe de HTTP.
export type DomainErrorKind = 'validation' | 'not_found' | 'invalid_state' | 'unavailable';

export abstract class DomainError {
  abstract readonly kind: DomainErrorKind;

  constructor(readonly message: string) {}
}

export class ValidationError extends DomainError {
  readonly kind = 'validation';
}

export class NotFoundError extends DomainError {
  readonly kind = 'not_found';
}

export class InvalidStateError extends DomainError {
  readonly kind = 'invalid_state';
}

/** Una dependencia externa (cola, almacenamiento) no respondió y la operación no pudo completarse. */
export class ServiceUnavailableError extends DomainError {
  readonly kind = 'unavailable';
}
