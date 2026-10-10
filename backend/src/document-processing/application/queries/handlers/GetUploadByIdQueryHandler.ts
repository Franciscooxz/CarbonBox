import type { IQueryHandler } from '../../../../shared/application/IQueryHandler';
import type { DomainError } from '../../../../shared/domain/DomainError';
import { type Either, left, right } from '../../../../shared/domain/Either';
import { UploadNotFoundError } from '../../../domain/errors/UploadErrors';
import type { IUploadRepository } from '../../../domain/repositories/IUploadRepository';
import { type UploadDto, toUploadDto } from '../../dto/UploadDto';
import type { GetUploadByIdQuery } from '../objects/GetUploadByIdQuery';

export class GetUploadByIdQueryHandler implements IQueryHandler<GetUploadByIdQuery, UploadDto> {
  private readonly uploadRepository: IUploadRepository;

  constructor({ uploadRepository }: { uploadRepository: IUploadRepository }) {
    this.uploadRepository = uploadRepository;
  }

  async execute(query: GetUploadByIdQuery): Promise<Either<DomainError, UploadDto>> {
    const upload = await this.uploadRepository.findById(query.uploadId);
    if (!upload) return left(new UploadNotFoundError(query.uploadId));
    return right(toUploadDto(upload));
  }
}
