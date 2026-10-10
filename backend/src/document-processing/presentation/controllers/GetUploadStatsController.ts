import { BaseController } from '../../../shared/infrastructure/http/BaseController';
import type { IHttpRequest } from '../../../shared/infrastructure/http/IHttpRequest';
import type { IHttpResponse } from '../../../shared/infrastructure/http/IHttpResponse';
import type {
  GetUploadStatsQueryHandler,
  UploadStats,
} from '../../application/queries/handlers/GetUploadStatsQueryHandler';
import { GetUploadStatsQuery } from '../../application/queries/objects/GetUploadStatsQuery';

export class GetUploadStatsController extends BaseController<UploadStats> {
  private readonly getUploadStatsQueryHandler: GetUploadStatsQueryHandler;
  private readonly defaultUserId: string;

  constructor(deps: { getUploadStatsQueryHandler: GetUploadStatsQueryHandler; defaultUserId: string }) {
    super();
    this.getUploadStatsQueryHandler = deps.getUploadStatsQueryHandler;
    this.defaultUserId = deps.defaultUserId;
  }

  async handle(_request: IHttpRequest): Promise<IHttpResponse<UploadStats>> {
    return this.respond(await this.getUploadStatsQueryHandler.execute(new GetUploadStatsQuery(this.defaultUserId)));
  }
}
