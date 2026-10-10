import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyInstance } from 'fastify';
import type { IConvictProps } from '../config/IConvictProps';
import {
  type DocumentProcessingContainer,
  createDocumentProcessingContainer,
} from '../document-processing/infrastructure/dependency-injection/DocumentProcessingModule';
import { documentProcessingRoutes } from '../document-processing/presentation/routes/DocumentProcessingRoutes';
import { errorHandler } from '../shared/infrastructure/http/errorHandler';
import { buildLoggerOptions } from '../shared/infrastructure/logging/logger';

export class App {
  readonly server: FastifyInstance;
  // Público para que los tests de integración usen las mismas instancias (Prisma, cola) que la API.
  readonly container: DocumentProcessingContainer;

  constructor(private readonly config: IConvictProps) {
    this.container = createDocumentProcessingContainer(config);
    this.server = Fastify({ logger: buildLoggerOptions(config) });
  }

  async build(): Promise<FastifyInstance> {
    await this.server.register(cors, { origin: this.config.corsOrigin });
    await this.server.register(multipart, {
      limits: { fileSize: this.config.maxFileSizeMb * 1024 * 1024, files: 1 },
    });
    this.server.setErrorHandler(errorHandler);

    this.server.get('/health', async () => ({ status: 'ok' }));
    await this.server.register(documentProcessingRoutes(this.container), { prefix: '/api/v1' });
    return this.server;
  }

  async start(): Promise<void> {
    await this.build();
    await this.server.listen({ port: this.config.port, host: '0.0.0.0' });
  }

  async stop(): Promise<void> {
    await this.server.close();
    await this.container.dispose();
    await this.container.cradle.prisma.$disconnect();
  }
}
