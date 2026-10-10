import pino from 'pino';
import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryActivityDataRepository, InMemoryFileStorage, InMemoryUploadRepository } from '../../test/fakes';
import { FailUploadCommandHandler } from '../document-processing/application/commands/handlers/FailUploadCommandHandler';
import { ProcessFileCommandHandler } from '../document-processing/application/commands/handlers/ProcessFileCommandHandler';
import { CsvParserService } from '../document-processing/application/services/CsvParserService';
import { Upload } from '../document-processing/domain/entities/Upload';
import type { IMessageConsumer, ReceivedMessage } from '../shared/application/messaging/IMessageConsumer';
import { FileProcessingWorker } from './FileProcessingWorker';

const MAX_RECEIVE_COUNT = 3;

/** Entrega una lista fija de mensajes y luego detiene el worker. */
class ScriptedConsumer implements IMessageConsumer<unknown> {
  readonly acknowledged: string[] = [];
  readonly retries: { receiptHandle: string; delaySeconds: number }[] = [];
  worker?: FileProcessingWorker;

  constructor(private readonly script: ReceivedMessage<unknown>[][]) {}

  async receive(): Promise<ReceivedMessage<unknown>[]> {
    const next = this.script.shift();
    if (!next) {
      this.worker?.stop();
      return [];
    }
    return next;
  }

  async acknowledge(message: ReceivedMessage<unknown>): Promise<void> {
    this.acknowledged.push(message.receiptHandle);
  }

  async retryLater(message: ReceivedMessage<unknown>, delaySeconds: number): Promise<void> {
    this.retries.push({ receiptHandle: message.receiptHandle, delaySeconds });
  }
}

describe('FileProcessingWorker', () => {
  let uploadRepository: InMemoryUploadRepository;
  let fileStorage: InMemoryFileStorage;

  beforeEach(() => {
    uploadRepository = new InMemoryUploadRepository(new InMemoryActivityDataRepository());
    fileStorage = new InMemoryFileStorage();
  });

  const runWorker = async (consumer: ScriptedConsumer): Promise<void> => {
    const activityDataRepository = new InMemoryActivityDataRepository();
    const worker = new FileProcessingWorker({
      messageConsumer: consumer,
      processFileCommandHandler: new ProcessFileCommandHandler({
        uploadRepository,
        activityDataRepository,
        fileStorage,
        csvParserService: new CsvParserService(),
      }),
      failUploadCommandHandler: new FailUploadCommandHandler({ uploadRepository }),
      logger: pino({ level: 'silent' }),
      maxReceiveCount: MAX_RECEIVE_COUNT,
      retryPolicy: { baseDelaySeconds: 10, factor: 4, maxDelaySeconds: 300 },
    });
    consumer.worker = worker;
    await worker.start();
  };

  const givenUpload = async (withFile: boolean): Promise<Upload> => {
    const result = Upload.create({ fileName: 'datos.csv', userId: 'user-123' });
    if (result.isLeft()) throw new Error(result.value.message);
    await uploadRepository.save(result.value);
    if (withFile) await fileStorage.save(result.value.fileUrl, Buffer.from('category,amount,unit,date\nA,1,u,2024-01-01\n'));
    return result.value;
  };

  const message = (body: unknown, receiveCount: number): ReceivedMessage<unknown> => ({
    body,
    receiptHandle: `rh-${receiveCount}`,
    receiveCount,
  });

  it('procesa el mensaje y lo borra de la cola', async () => {
    const upload = await givenUpload(true);
    const consumer = new ScriptedConsumer([[message({ uploadId: upload.id }, 1)]]);

    await runWorker(consumer);

    expect(upload.status.value).toBe('COMPLETED');
    expect(consumer.acknowledged).toEqual(['rh-1']);
  });

  it('ante un error transitorio NO borra el mensaje y el upload sigue reintentable', async () => {
    const upload = await givenUpload(false); // falta el archivo → read() lanza
    const consumer = new ScriptedConsumer([[message({ uploadId: upload.id }, 1)]]);

    await runWorker(consumer);

    expect(consumer.acknowledged).toEqual([]);
    expect(upload.status.value).toBe('PROCESSING');
  });

  it('en el último intento marca el upload FAILED (y el mensaje irá a la DLQ)', async () => {
    const upload = await givenUpload(false);
    const consumer = new ScriptedConsumer([
      [message({ uploadId: upload.id }, 1)],
      [message({ uploadId: upload.id }, 2)],
      [message({ uploadId: upload.id }, MAX_RECEIVE_COUNT)],
    ]);

    await runWorker(consumer);

    expect(upload.status.value).toBe('FAILED');
    expect(upload.errorMessage).toContain('varios intentos');
    expect(consumer.acknowledged).toEqual([]);
  });

  it('programa cada reintento con backoff exponencial y no reintenta en el último intento', async () => {
    const upload = await givenUpload(false);
    const consumer = new ScriptedConsumer([
      [message({ uploadId: upload.id }, 1)],
      [message({ uploadId: upload.id }, 2)],
      [message({ uploadId: upload.id }, MAX_RECEIVE_COUNT)],
    ]);

    await runWorker(consumer);

    // Intento 1 → espera 10 s; intento 2 → 40 s; intento 3 (último) → sin reintento, va a la DLQ.
    expect(consumer.retries).toEqual([
      { receiptHandle: 'rh-1', delaySeconds: 10 },
      { receiptHandle: 'rh-2', delaySeconds: 40 },
    ]);
  });

  it('un error de negocio no se reintenta: se borra el mensaje', async () => {
    const consumer = new ScriptedConsumer([[message({ uploadId: 'no-existe' }, 1)]]);

    await runWorker(consumer);

    expect(consumer.acknowledged).toEqual(['rh-1']);
    expect(consumer.retries).toEqual([]);
  });

  it('descarta (borra) un mensaje mal formado', async () => {
    const consumer = new ScriptedConsumer([[message({ otro: 'campo' }, 1)]]);

    await runWorker(consumer);

    expect(consumer.acknowledged).toEqual(['rh-1']);
  });
});
