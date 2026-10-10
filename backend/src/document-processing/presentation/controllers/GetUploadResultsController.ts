import { BaseController } from '../../../shared/infrastructure/http/BaseController';
import type { IHttpRequest } from '../../../shared/infrastructure/http/IHttpRequest';
import type { IHttpResponse } from '../../../shared/infrastructure/http/IHttpResponse';
import type {
  GetUploadResultsQueryHandler,
  UploadResults,
} from '../../application/queries/handlers/GetUploadResultsQueryHandler';
import { GetUploadResultsQuery } from '../../application/queries/objects/GetUploadResultsQuery';

export class GetUploadResultsController extends BaseController<UploadResults> {
  private readonly getUploadResultsQueryHandler: GetUploadResultsQueryHandler;

  constructor(deps: { getUploadResultsQueryHandler: GetUploadResultsQueryHandler }) {
    super();
    this.getUploadResultsQueryHandler = deps.getUploadResultsQueryHandler;
  }

  async handle(request: IHttpRequest): Promise<IHttpResponse<UploadResults>> {
    const result = await this.getUploadResultsQueryHandler.execute(new GetUploadResultsQuery(request.params.id ?? ''));
    return this.respond(result);
  }
}
