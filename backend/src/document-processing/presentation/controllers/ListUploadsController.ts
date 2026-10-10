import { BaseController } from '../../../shared/infrastructure/http/BaseController';
import type { IHttpRequest } from '../../../shared/infrastructure/http/IHttpRequest';
import type { IHttpResponse } from '../../../shared/infrastructure/http/IHttpResponse';
import type {
  ListUploadsQueryHandler,
  ListUploadsResult,
} from '../../application/queries/handlers/ListUploadsQueryHandler';
import { ListUploadsQuery } from '../../application/queries/objects/ListUploadsQuery';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

export class ListUploadsController extends BaseController<ListUploadsResult> {
  private readonly listUploadsQueryHandler: ListUploadsQueryHandler;
  private readonly defaultUserId: string;

  constructor(deps: { listUploadsQueryHandler: ListUploadsQueryHandler; defaultUserId: string }) {
    super();
    this.listUploadsQueryHandler = deps.listUploadsQueryHandler;
    this.defaultUserId = deps.defaultUserId;
  }

  async handle(request: IHttpRequest): Promise<IHttpResponse<ListUploadsResult>> {
    // Solo traduce texto de la URL a números; validar el rango es trabajo del handler.
    const page = request.query.page ? Number(request.query.page) : DEFAULT_PAGE;
    const limit = request.query.limit ? Number(request.query.limit) : DEFAULT_LIMIT;
    const result = await this.listUploadsQueryHandler.execute(new ListUploadsQuery(this.defaultUserId, page, limit));
    return this.respond(result);
  }
}
