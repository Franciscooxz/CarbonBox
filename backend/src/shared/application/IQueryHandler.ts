import type { DomainError } from '../domain/DomainError';
import type { Either } from '../domain/Either';

export interface IQueryHandler<TQuery, TResult> {
  execute(query: TQuery): Promise<Either<DomainError, TResult>>;
}
