import type { DomainError } from '../domain/DomainError';
import type { Either } from '../domain/Either';

export interface ICommandHandler<TCommand, TResult> {
  execute(command: TCommand): Promise<Either<DomainError, TResult>>;
}
