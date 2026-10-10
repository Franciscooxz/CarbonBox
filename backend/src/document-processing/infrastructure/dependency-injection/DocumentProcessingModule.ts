import { SQSClient } from '@aws-sdk/client-sqs';
import { PrismaClient } from '@prisma/client';
import { type AwilixContainer, InjectionMode, asClass, asValue, createContainer } from 'awilix';
import type { IConvictProps } from '../../../config/IConvictProps';
import type { IMessageConsumer } from '../../../shared/application/messaging/IMessageConsumer';
import type { IMessagePublisher } from '../../../shared/application/messaging/IMessagePublisher';
import { CreateUploadCommandHandler } from '../../application/commands/handlers/CreateUploadCommandHandler';
import { FailUploadCommandHandler } from '../../application/commands/handlers/FailUploadCommandHandler';
import { ProcessFileCommandHandler } from '../../application/commands/handlers/ProcessFileCommandHandler';
import type { FileUploadedMessage } from '../../application/messages/FileUploadedMessage';
import type { IFileStorage } from '../../application/ports/IFileStorage';
import { GetUploadByIdQueryHandler } from '../../application/queries/handlers/GetUploadByIdQueryHandler';
import { GetUploadResultsQueryHandler } from '../../application/queries/handlers/GetUploadResultsQueryHandler';
import { GetUploadStatsQueryHandler } from '../../application/queries/handlers/GetUploadStatsQueryHandler';
import { ListUploadsQueryHandler } from '../../application/queries/handlers/ListUploadsQueryHandler';
import { CsvParserService } from '../../application/services/CsvParserService';
import type { IActivityDataRepository } from '../../domain/repositories/IActivityDataRepository';
import type { IUploadRepository } from '../../domain/repositories/IUploadRepository';
import { CreateUploadController } from '../../presentation/controllers/CreateUploadController';
import { GetUploadByIdController } from '../../presentation/controllers/GetUploadByIdController';
import { GetUploadResultsController } from '../../presentation/controllers/GetUploadResultsController';
import { GetUploadStatsController } from '../../presentation/controllers/GetUploadStatsController';
import { ListUploadsController } from '../../presentation/controllers/ListUploadsController';
import { SqsMessageConsumer } from '../messaging/SqsMessageConsumer';
import { SqsMessagePublisher } from '../messaging/SqsMessagePublisher';
import { PrismaActivityDataRepository } from '../persistence/repositories/PrismaActivityDataRepository';
import { PrismaUploadRepository } from '../persistence/repositories/PrismaUploadRepository';
import { LocalFileStorage } from '../storage/LocalFileStorage';

// Todo lo que el contenedor sabe construir. Los handlers solo ven interfaces (IUploadRepository...),
// y este es el único lugar donde se decide qué implementación concreta se usa.
export interface Cradle {
  // Valores de configuración
  defaultUserId: string;
  storageDir: string;
  queueUrl: string;
  waitTimeSeconds: number;
  // Clientes externos
  prisma: PrismaClient;
  sqsClient: SQSClient;
  // Infraestructura (registrada por interfaz)
  uploadRepository: IUploadRepository;
  activityDataRepository: IActivityDataRepository;
  fileStorage: IFileStorage;
  messagePublisher: IMessagePublisher<FileUploadedMessage>;
  messageConsumer: IMessageConsumer<unknown>;
  // Aplicación
  csvParserService: CsvParserService;
  createUploadCommandHandler: CreateUploadCommandHandler;
  processFileCommandHandler: ProcessFileCommandHandler;
  failUploadCommandHandler: FailUploadCommandHandler;
  getUploadByIdQueryHandler: GetUploadByIdQueryHandler;
  listUploadsQueryHandler: ListUploadsQueryHandler;
  getUploadResultsQueryHandler: GetUploadResultsQueryHandler;
  getUploadStatsQueryHandler: GetUploadStatsQueryHandler;
  // Presentación
  createUploadController: CreateUploadController;
  getUploadByIdController: GetUploadByIdController;
  listUploadsController: ListUploadsController;
  getUploadResultsController: GetUploadResultsController;
  getUploadStatsController: GetUploadStatsController;
}

export type DocumentProcessingContainer = AwilixContainer<Cradle>;

export const createDocumentProcessingContainer = (config: IConvictProps): DocumentProcessingContainer => {
  // PROXY: cada constructor recibe un objeto { dependencia } y Awilix resuelve por nombre.
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY, strict: true });

  container.register({
    defaultUserId: asValue(config.defaultUserId),
    storageDir: asValue(config.storage.dir),
    queueUrl: asValue(config.sqs.queueUrl),
    waitTimeSeconds: asValue(config.sqs.waitTimeSeconds),

    prisma: asValue(new PrismaClient({ datasourceUrl: config.databaseUrl })),
    sqsClient: asValue(
      new SQSClient({
        region: config.aws.region,
        // Vacío = AWS real. Con valor = ElasticMQ/LocalStack local.
        ...(config.sqs.endpoint ? { endpoint: config.sqs.endpoint } : {}),
        credentials: { accessKeyId: config.aws.accessKeyId, secretAccessKey: config.aws.secretAccessKey },
      }),
    ),

    uploadRepository: asClass(PrismaUploadRepository).singleton(),
    activityDataRepository: asClass(PrismaActivityDataRepository).singleton(),
    fileStorage: asClass(LocalFileStorage).singleton(),
    messagePublisher: asClass(SqsMessagePublisher).singleton(),
    messageConsumer: asClass(SqsMessageConsumer).singleton(),

    csvParserService: asClass(CsvParserService).singleton(),
    createUploadCommandHandler: asClass(CreateUploadCommandHandler).singleton(),
    processFileCommandHandler: asClass(ProcessFileCommandHandler).singleton(),
    failUploadCommandHandler: asClass(FailUploadCommandHandler).singleton(),
    getUploadByIdQueryHandler: asClass(GetUploadByIdQueryHandler).singleton(),
    listUploadsQueryHandler: asClass(ListUploadsQueryHandler).singleton(),
    getUploadResultsQueryHandler: asClass(GetUploadResultsQueryHandler).singleton(),
    getUploadStatsQueryHandler: asClass(GetUploadStatsQueryHandler).singleton(),

    createUploadController: asClass(CreateUploadController).singleton(),
    getUploadByIdController: asClass(GetUploadByIdController).singleton(),
    listUploadsController: asClass(ListUploadsController).singleton(),
    getUploadResultsController: asClass(GetUploadResultsController).singleton(),
    getUploadStatsController: asClass(GetUploadStatsController).singleton(),
  });

  return container;
};
