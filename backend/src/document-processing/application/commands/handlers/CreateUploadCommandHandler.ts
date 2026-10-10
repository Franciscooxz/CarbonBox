import type { ICommandHandler } from '../../../../shared/application/ICommandHandler';
import type { IMessagePublisher } from '../../../../shared/application/messaging/IMessagePublisher';
import { type DomainError, ServiceUnavailableError } from '../../../../shared/domain/DomainError';
import { type Either, left, right } from '../../../../shared/domain/Either';
import { Upload } from '../../../domain/entities/Upload';
import type { IUploadRepository } from '../../../domain/repositories/IUploadRepository';
import { type UploadDto, toUploadDto } from '../../dto/UploadDto';
import type { FileUploadedMessage } from '../../messages/FileUploadedMessage';
import type { IFileStorage } from '../../ports/IFileStorage';
import type { CreateUploadCommand } from '../objects/CreateUploadCommand';

interface Dependencies {
  uploadRepository: IUploadRepository;
  fileStorage: IFileStorage;
  messagePublisher: IMessagePublisher<FileUploadedMessage>;
}

export class CreateUploadCommandHandler implements ICommandHandler<CreateUploadCommand, UploadDto> {
  private readonly uploadRepository: IUploadRepository;
  private readonly fileStorage: IFileStorage;
  private readonly messagePublisher: IMessagePublisher<FileUploadedMessage>;

  constructor({ uploadRepository, fileStorage, messagePublisher }: Dependencies) {
    this.uploadRepository = uploadRepository;
    this.fileStorage = fileStorage;
    this.messagePublisher = messagePublisher;
  }

  async execute(command: CreateUploadCommand): Promise<Either<DomainError, UploadDto>> {
    const uploadOrError = Upload.create({ fileName: command.fileName, userId: command.userId });
    if (uploadOrError.isLeft()) return left(uploadOrError.value);
    const upload = uploadOrError.value;

    // Orden: archivo → registro → mensaje. Si el mensaje llegara antes que el registro,
    // el worker buscaría un upload que todavía no existe.
    await this.fileStorage.save(upload.fileUrl, command.content);
    await this.uploadRepository.save(upload);

    try {
      await this.messagePublisher.publish({ uploadId: upload.id });
    } catch {
      // Sin mensaje nadie procesará el archivo: se marca FAILED para no dejarlo en PENDING para siempre.
      upload.fail('No se pudo encolar el archivo para su procesamiento. Intenta subirlo de nuevo.');
      await this.uploadRepository.save(upload);
      return left(new ServiceUnavailableError('La cola de procesamiento no está disponible'));
    }

    return right(toUploadDto(upload));
  }
}
