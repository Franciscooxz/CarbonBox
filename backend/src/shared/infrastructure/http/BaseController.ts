import type { DomainError } from '../../domain/DomainError';
import type { Either } from '../../domain/Either';
import type { IHttpRequest } from './IHttpRequest';
import type { IHttpResponse } from './IHttpResponse';

/** Lleva un DomainError (Left) hasta el error handler central, que decide el código HTTP. */
export class DomainErrorException extends Error {
  constructor(readonly domainError: DomainError) {
    super(domainError.message);
    this.name = 'DomainErrorException';
  }
}

export abstract class BaseController<TBody = unknown> {
  abstract handle(request: IHttpRequest): Promise<IHttpResponse<TBody>>;

  // Sin try/catch: si el handler retornó Left, el error sube y lo traduce el error handler central.
  protected respond<T extends TBody>(result: Either<DomainError, T>, statusCode = 200): IHttpResponse<TBody> {
    if (result.isLeft()) throw new DomainErrorException(result.value);
    return { statusCode, body: result.value };
  }
}
