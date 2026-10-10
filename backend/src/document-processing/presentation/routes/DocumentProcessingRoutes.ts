import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { BaseController } from '../../../shared/infrastructure/http/BaseController';
import type { IHttpRequest, UploadedFile } from '../../../shared/infrastructure/http/IHttpRequest';
import type { DocumentProcessingContainer } from '../../infrastructure/dependency-injection/DocumentProcessingModule';

type StringRecord = Record<string, string | undefined>;

// Adaptador Fastify → IHttpRequest. Es lo único que sabe de Fastify en esta capa.
const toHttpRequest = (request: FastifyRequest, file?: UploadedFile): IHttpRequest => ({
  params: (request.params ?? {}) as StringRecord,
  query: (request.query ?? {}) as StringRecord,
  file,
});

const send = async (controller: BaseController, httpRequest: IHttpRequest, reply: FastifyReply): Promise<void> => {
  const response = await controller.handle(httpRequest);
  await reply.status(response.statusCode).send(response.body);
};

export const documentProcessingRoutes =
  (container: DocumentProcessingContainer) =>
  async (app: FastifyInstance): Promise<void> => {
    const { cradle } = container;

    app.post('/uploads', async (request, reply) => {
      // request.file() devuelve undefined si no vino ningún archivo; toBuffer() lanza 413 si supera el límite.
      const part = await request.file();
      const file = part ? { fileName: part.filename, content: await part.toBuffer() } : undefined;
      await send(cradle.createUploadController, toHttpRequest(request, file), reply);
    });

    app.get('/uploads', async (request, reply) => send(cradle.listUploadsController, toHttpRequest(request), reply));

    // Ruta estática: Fastify la prioriza sobre /uploads/:id, así "stats" nunca se toma como id.
    app.get('/uploads/stats', async (request, reply) =>
      send(cradle.getUploadStatsController, toHttpRequest(request), reply),
    );

    app.get('/uploads/:id', async (request, reply) =>
      send(cradle.getUploadByIdController, toHttpRequest(request), reply),
    );

    app.get('/uploads/:id/results', async (request, reply) =>
      send(cradle.getUploadResultsController, toHttpRequest(request), reply),
    );
  };
