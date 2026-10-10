import type { IQueryHandler } from '../../../../shared/application/IQueryHandler';
import type { DomainError } from '../../../../shared/domain/DomainError';
import { type Either, right } from '../../../../shared/domain/Either';
import type { IUploadRepository } from '../../../domain/repositories/IUploadRepository';
import type { GetUploadStatsQuery } from '../objects/GetUploadStatsQuery';

export interface UploadStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export class GetUploadStatsQueryHandler implements IQueryHandler<GetUploadStatsQuery, UploadStats> {
  private readonly uploadRepository: IUploadRepository;

  constructor({ uploadRepository }: { uploadRepository: IUploadRepository }) {
    this.uploadRepository = uploadRepository;
  }

  async execute(query: GetUploadStatsQuery): Promise<Either<DomainError, UploadStats>> {
    const counts = await this.uploadRepository.countByStatus(query.userId);
    return right({
      total: counts.PENDING + counts.PROCESSING + counts.COMPLETED + counts.FAILED,
      pending: counts.PENDING,
      processing: counts.PROCESSING,
      completed: counts.COMPLETED,
      failed: counts.FAILED,
    });
  }
}
