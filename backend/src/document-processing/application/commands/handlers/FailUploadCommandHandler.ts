import type { ICommandHandler } from '../../../../shared/application/ICommandHandler';
import type { DomainError } from '../../../../shared/domain/DomainError';
import { type Either, left, right } from '../../../../shared/domain/Either';
import { UploadNotFoundError } from '../../../domain/errors/UploadErrors';
import type { IUploadRepository } from '../../../domain/repositories/IUploadRepository';
import type { FailUploadCommand } from '../objects/FailUploadCommand';

export class FailUploadCommandHandler implements ICommandHandler<FailUploadCommand, void> {
  private readonly uploadRepository: IUploadRepository;

  constructor({ uploadRepository }: { uploadRepository: IUploadRepository }) {
    this.uploadRepository = uploadRepository;
  }

  async execute(command: FailUploadCommand): Promise<Either<DomainError, void>> {
    const upload = await this.uploadRepository.findById(command.uploadId);
    if (!upload) return left(new UploadNotFoundError(command.uploadId));
    if (upload.status.isFinal()) return right(undefined);

    const failed = upload.fail(command.reason);
    if (failed.isLeft()) return left(failed.value);
    await this.uploadRepository.save(upload);
    return right(undefined);
  }
}
