import type { IQueryHandler } from '../../../../shared/application/IQueryHandler';
import { type DomainError, ValidationError } from '../../../../shared/domain/DomainError';
import { type Either, left, right } from '../../../../shared/domain/Either';
import type { IUploadRepository } from '../../../domain/repositories/IUploadRepository';
import { type UploadDto, toUploadDto } from '../../dto/UploadDto';
import type { ListUploadsQuery } from '../objects/ListUploadsQuery';

export const MAX_PAGE_SIZE = 100;

export interface ListUploadsResult {
  data: UploadDto[];
  total: number;
  page: number;
  limit: number;
}

export class ListUploadsQueryHandler implements IQueryHandler<ListUploadsQuery, ListUploadsResult> {
  private readonly uploadRepository: IUploadRepository;

  constructor({ uploadRepository }: { uploadRepository: IUploadRepository }) {
    this.uploadRepository = uploadRepository;
  }

  async execute(query: ListUploadsQuery): Promise<Either<DomainError, ListUploadsResult>> {
    if (!Number.isInteger(query.page) || query.page < 1) {
      return left(new ValidationError('page debe ser un entero mayor o igual a 1'));
    }
    if (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > MAX_PAGE_SIZE) {
      return left(new ValidationError(`limit debe ser un entero entre 1 y ${MAX_PAGE_SIZE}`));
    }

    const { items, total } = await this.uploadRepository.list(query);
    return right({ data: items.map(toUploadDto), total, page: query.page, limit: query.limit });
  }
}
