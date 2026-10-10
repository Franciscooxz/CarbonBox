import { ValidationError } from '../../../shared/domain/DomainError';
import { left } from '../../../shared/domain/Either';
import { BaseController } from '../../../shared/infrastructure/http/BaseController';
import type { IHttpRequest } from '../../../shared/infrastructure/http/IHttpRequest';
import type { IHttpResponse } from '../../../shared/infrastructure/http/IHttpResponse';
import type { CreateUploadCommandHandler } from '../../application/commands/handlers/CreateUploadCommandHandler';
import { CreateUploadCommand } from '../../application/commands/objects/CreateUploadCommand';
import type { UploadDto } from '../../application/dto/UploadDto';

type CreateUploadResponse = Pick<UploadDto, 'id' | 'status' | 'fileName' | 'createdAt'>;

export class CreateUploadController extends BaseController<CreateUploadResponse> {
  private readonly createUploadCommandHandler: CreateUploadCommandHandler;
  private readonly defaultUserId: string;

  constructor(deps: { createUploadCommandHandler: CreateUploadCommandHandler; defaultUserId: string }) {
    super();
    this.createUploadCommandHandler = deps.createUploadCommandHandler;
    this.defaultUserId = deps.defaultUserId;
  }

  async handle(request: IHttpRequest): Promise<IHttpResponse<CreateUploadResponse>> {
    if (!request.file) return this.respond(left(new ValidationError('Debes enviar un archivo en el campo "file"')));

    const result = await this.createUploadCommandHandler.execute(
      new CreateUploadCommand(request.file.fileName, request.file.content, this.defaultUserId),
    );
    if (result.isLeft()) return this.respond(result);

    const { id, status, fileName, createdAt } = result.value;
    return { statusCode: 201, body: { id, status, fileName, createdAt } };
  }
}
