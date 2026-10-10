import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GetQueueAttributesCommand, PurgeQueueCommand } from '@aws-sdk/client-sqs';
import pino from 'pino';
import { appConfig } from '../../src/config';
import type { IConvictProps } from '../../src/config/IConvictProps';
import { App } from '../../src/main/App';
import { FileProcessingWorker } from '../../src/workers/FileProcessingWorker';

export const SAMPLES_DIR = path.resolve(__dirname, '../../..');
export const readSample = (name: string): Buffer => fs.readFileSync(path.join(SAMPLES_DIR, name));

export interface TestContext {
  app: App;
  worker: FileProcessingWorker;
  config: IConvictProps;
}

/** Levanta la API real (sin abrir puerto) y un worker real que comparten base de datos, cola y almacenamiento. */
export const createTestContext = async (overrides: Partial<IConvictProps> = {}): Promise<TestContext> => {
  const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'carbonbox-it-'));
  const config: IConvictProps = { ...appConfig, ...overrides, storage: { dir: storageDir } };

  const app = new App(config);
  await app.build();

  const { cradle } = app.container;
  const worker = new FileProcessingWorker({
    messageConsumer: cradle.messageConsumer,
    processFileCommandHandler: cradle.processFileCommandHandler,
    failUploadCommandHandler: cradle.failUploadCommandHandler,
    logger: pino({ level: 'silent' }),
    maxReceiveCount: config.sqs.maxReceiveCount,
    retryPolicy: {
      baseDelaySeconds: config.sqs.retryBaseDelaySeconds,
      factor: config.sqs.retryBackoffFactor,
      maxDelaySeconds: config.sqs.retryMaxDelaySeconds,
    },
  });
  return { app, worker, config };
};

/** Deja base de datos y cola vacías antes de cada test. */
export const resetState = async ({ app, config }: TestContext): Promise<void> => {
  const { prisma, sqsClient } = app.container.cradle;
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "ActivityData", "Upload" CASCADE');
  await sqsClient.send(new PurgeQueueCommand({ QueueUrl: config.sqs.queueUrl }));
};

export const closeTestContext = async ({ app, config }: TestContext): Promise<void> => {
  await app.stop();
  fs.rmSync(config.storage.dir, { recursive: true, force: true });
};

export const queueCounts = async ({ app, config }: TestContext): Promise<{ visible: number; inFlight: number }> => {
  const response = await app.container.cradle.sqsClient.send(
    new GetQueueAttributesCommand({
      QueueUrl: config.sqs.queueUrl,
      AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible'],
    }),
  );
  return {
    visible: Number(response.Attributes?.ApproximateNumberOfMessages ?? 0),
    inFlight: Number(response.Attributes?.ApproximateNumberOfMessagesNotVisible ?? 0),
  };
};

/** Arma un cuerpo multipart/form-data a mano, como lo enviaría el navegador. */
export const multipartUpload = (fileName: string, content: Buffer): { payload: Buffer; headers: Record<string, string> } => {
  const boundary = '----carbonbox-test-boundary';
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: text/csv\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return {
    payload: Buffer.concat([head, content, tail]),
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
  };
};
