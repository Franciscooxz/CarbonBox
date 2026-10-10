import type { IQueryHandler } from '../../../../shared/application/IQueryHandler';
import type { DomainError } from '../../../../shared/domain/DomainError';
import { type Either, left, right } from '../../../../shared/domain/Either';
import { UploadNotFoundError } from '../../../domain/errors/UploadErrors';
import type { IActivityDataRepository } from '../../../domain/repositories/IActivityDataRepository';
import type { IUploadRepository } from '../../../domain/repositories/IUploadRepository';
import { type ActivityDataDto, toActivityDataDto } from '../../dto/UploadDto';
import type { GetUploadResultsQuery } from '../objects/GetUploadResultsQuery';

export interface UploadResults {
  data: ActivityDataDto[];
}

interface Dependencies {
  uploadRepository: IUploadRepository;
  activityDataRepository: IActivityDataRepository;
}

export class GetUploadResultsQueryHandler implements IQueryHandler<GetUploadResultsQuery, UploadResults> {
  private readonly uploadRepository: IUploadRepository;
  private readonly activityDataRepository: IActivityDataRepository;

  constructor({ uploadRepository, activityDataRepository }: Dependencies) {
    this.uploadRepository = uploadRepository;
    this.activityDataRepository = activityDataRepository;
  }

  async execute(query: GetUploadResultsQuery): Promise<Either<DomainError, UploadResults>> {
    // Distingue "el upload no existe" (404) de "existe pero no tiene filas" (200 con data vacía).
    const upload = await this.uploadRepository.findById(query.uploadId);
    if (!upload) return left(new UploadNotFoundError(query.uploadId));

    const activities = await this.activityDataRepository.findByUploadId(query.uploadId);
    return right({ data: activities.map(toActivityDataDto) });
  }
}
