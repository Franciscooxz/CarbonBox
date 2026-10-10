import { BaseController } from '../../../shared/infrastructure/http/BaseController';
import type { IHttpRequest } from '../../../shared/infrastructure/http/IHttpRequest';
import type { IHttpResponse } from '../../../shared/infrastructure/http/IHttpResponse';
import type { UploadDto } from '../../application/dto/UploadDto';
import type { GetUploadByIdQueryHandler } from '../../application/queries/handlers/GetUploadByIdQueryHandler';
import { GetUploadByIdQuery } from '../../application/queries/objects/GetUploadByIdQuery';

export class GetUploadByIdController extends BaseController<UploadDto> {
  private readonly getUploadByIdQueryHandler: GetUploadByIdQueryHandler;

  constructor(deps: { getUploadByIdQueryHandler: GetUploadByIdQueryHandler }) {
    super();
    this.getUploadByIdQueryHandler = deps.getUploadByIdQueryHandler;
  }

  async handle(request: IHttpRequest): Promise<IHttpResponse<UploadDto>> {
    const result = await this.getUploadByIdQueryHandler.execute(new GetUploadByIdQuery(request.params.id ?? ''));
    return this.respond(result);
  }
}
