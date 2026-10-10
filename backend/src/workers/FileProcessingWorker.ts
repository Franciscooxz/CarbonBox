import type { Logger } from 'pino';
import { appConfig } from '../config';
import type { IConvictProps } from '../config/IConvictProps';
import type { FailUploadCommandHandler } from '../document-processing/application/commands/handlers/FailUploadCommandHandler';
import type { ProcessFileCommandHandler } from '../document-processing/application/commands/handlers/ProcessFileCommandHandler';
import { FailUploadCommand } from '../document-processing/application/commands/objects/FailUploadCommand';
import { ProcessFileCommand } from '../document-processing/application/commands/objects/ProcessFileCommand';
import { isFileUploadedMessage } from '../document-processing/application/messages/FileUploadedMessage';
import { createDocumentProcessingContainer } from '../document-processing/infrastructure/dependency-injection/DocumentProcessingModule';
import type { IMessageConsumer, ReceivedMessage } from '../shared/application/messaging/IMessageConsumer';
import { type BackoffPolicy, computeBackoffSeconds } from '../shared/application/retry/exponentialBackoff';
import { createLogger } from '../shared/infrastructure/logging/logger';

const ERROR_PAUSE_MS = 2000;
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface WorkerDependencies {
  messageConsumer: IMessageConsumer<unknown>;
  processFileCommandHandler: ProcessFileCommandHandler;
  failUploadCommandHandler: FailUploadCommandHandler;
  logger: Logger;
  maxReceiveCount: number;
  retryPolicy: BackoffPolicy;
}

export class FileProcessingWorker {
  private running = false;
  private readonly abortController = new AbortController();

  constructor(private readonly deps: WorkerDependencies) {}

  async start(): Promise<void> {
    this.running = true;
    this.deps.logger.info('Worker iniciado, esperando mensajes');
    while (this.running) {
      try {
        await this.pollOnce();
      } catch (error) {
        if (!this.running) break; // receive() abortado por el apagado: no es un error.
        // Cola caída o error de red: se registra y se reintenta tras una pausa en vez de morir.
        this.deps.logger.error({ err: error }, 'Error leyendo la cola');
        await sleep(ERROR_PAUSE_MS);
      }
    }
    this.deps.logger.info('Worker detenido');
  }

  /** Una vuelta del bucle: recibe y procesa lo que haya. Pública para poder probarla sin el bucle infinito. */
  async pollOnce(): Promise<number> {
    const messages = await this.deps.messageConsumer.receive(this.abortController.signal);
    for (const message of messages) await this.handle(message);
    return messages.length;
  }

  /** Apagado limpio: deja terminar el mensaje en curso y corta la espera del long polling. */
  stop(): void {
    this.running = false;
    this.abortController.abort();
  }

  private async handle(message: ReceivedMessage<unknown>): Promise<void> {
    const log = this.deps.logger.child({ receiveCount: message.receiveCount });

    if (!isFileUploadedMessage(message.body)) {
      // Un mensaje mal formado nunca se va a poder procesar: reintentarlo es inútil.
      log.warn({ body: message.body }, 'Mensaje inválido descartado');
      await this.deps.messageConsumer.acknowledge(message);
      return;
    }
    const { uploadId } = message.body;

    try {
      const result = await this.deps.processFileCommandHandler.execute(new ProcessFileCommand(uploadId));
      if (result.isLeft()) {
        // Error de negocio (upload inexistente, transición inválida): reintentar daría lo mismo.
        log.warn({ uploadId, error: result.value.message }, 'No se pudo procesar el upload');
      } else {
        log.info({ ...result.value }, result.value.skipped ? 'Mensaje duplicado ignorado' : 'Upload procesado');
      }
      // Solo se borra el mensaje cuando el trabajo terminó.
      await this.deps.messageConsumer.acknowledge(message);
    } catch (error) {
      // Error transitorio (DB caída, archivo ilegible): NO se borra el mensaje, SQS lo reentrega
      // cuando vence el visibility timeout. En el último intento se marca FAILED (ADR-003).
      log.error({ err: error, uploadId }, 'Fallo procesando el upload');
      if (message.receiveCount >= this.deps.maxReceiveCount) {
        const failed = await this.deps.failUploadCommandHandler.execute(
          new FailUploadCommand(uploadId, 'Error interno procesando el archivo tras varios intentos'),
        );
        if (failed.isLeft()) log.error({ uploadId, error: failed.value.message }, 'No se pudo marcar FAILED');
        log.warn({ uploadId }, 'Reintentos agotados: upload marcado FAILED, el mensaje irá a la DLQ');
        return;
      }
      await this.scheduleRetry(message, uploadId, log);
    }
  }

  /** Exponential backoff: cada reintento espera más que el anterior (10 s, 40 s, 160 s...). */
  private async scheduleRetry(message: ReceivedMessage<unknown>, uploadId: string, log: Logger): Promise<void> {
    const delaySeconds = computeBackoffSeconds(message.receiveCount, this.deps.retryPolicy);
    try {
      await this.deps.messageConsumer.retryLater(message, delaySeconds);
      log.info({ uploadId, delaySeconds }, 'Reintento programado con backoff exponencial');
    } catch (error) {
      // Si no se pudo cambiar la espera, el mensaje igual reaparece tras el visibility timeout por defecto.
      log.error({ err: error, uploadId }, 'No se pudo programar el reintento; se usará la espera por defecto');
    }
  }
}

const run = async (config: IConvictProps): Promise<void> => {
  const container = createDocumentProcessingContainer(config);
  const worker = new FileProcessingWorker({
    messageConsumer: container.cradle.messageConsumer,
    processFileCommandHandler: container.cradle.processFileCommandHandler,
    failUploadCommandHandler: container.cradle.failUploadCommandHandler,
    logger: createLogger(config, 'file-processing-worker'),
    maxReceiveCount: config.sqs.maxReceiveCount,
    retryPolicy: {
      baseDelaySeconds: config.sqs.retryBaseDelaySeconds,
      factor: config.sqs.retryBackoffFactor,
      maxDelaySeconds: config.sqs.retryMaxDelaySeconds,
    },
  });

  process.on('SIGINT', () => worker.stop());
  process.on('SIGTERM', () => worker.stop());

  await worker.start();
  await container.cradle.prisma.$disconnect();
};

// Solo arranca si se ejecuta directamente (npm run worker), no al importarlo en un test.
if (require.main === module) {
  run(appConfig).catch((error: unknown) => {
    console.error('El worker terminó con error', error);
    process.exit(1);
  });
}
