import fs from 'node:fs';
import path from 'node:path';
import convict from 'convict';
import dotenv from 'dotenv';
import type { IConvictProps } from './IConvictProps';

// Carga .env.<NODE_ENV> si existe (p. ej. .env.test) y luego .env como respaldo.
// dotenv no sobrescribe variables ya definidas, así que el entorno real (Docker/ECS) siempre gana.
// Excepción: en tests, .env.test SÍ sobrescribe. Prisma Client carga el .env de desarrollo al importarse,
// y sin esto los tests podrían apuntar a la base de datos de desarrollo.
const nodeEnv = process.env.NODE_ENV ?? 'development';
for (const file of [`.env.${nodeEnv}`, '.env']) {
  const fullPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(fullPath)) dotenv.config({ path: fullPath, override: nodeEnv === 'test' && file === '.env.test' });
}

const config = convict<IConvictProps>({
  env: { doc: 'Ambiente', format: ['development', 'test', 'production'], default: 'development', env: 'NODE_ENV' },
  port: { doc: 'Puerto HTTP', format: 'port', default: 3001, env: 'PORT' },
  logLevel: { doc: 'Nivel de log de pino', format: String, default: 'info', env: 'LOG_LEVEL' },
  corsOrigin: { doc: 'Origen permitido (frontend)', format: String, default: 'http://localhost:3000', env: 'CORS_ORIGIN' },
  databaseUrl: { doc: 'URL de PostgreSQL', format: String, default: '', env: 'DATABASE_URL', sensitive: true },
  defaultUserId: { doc: 'Usuario fijo (sin autenticación)', format: String, default: 'user-123', env: 'DEFAULT_USER_ID' },
  maxFileSizeMb: { doc: 'Tamaño máximo del CSV', format: 'nat', default: 10, env: 'MAX_FILE_SIZE_MB' },
  storage: {
    dir: { doc: 'Carpeta donde se guardan los archivos', format: String, default: './uploads', env: 'STORAGE_DIR' },
  },
  aws: {
    region: { doc: 'Región AWS', format: String, default: 'us-east-1', env: 'AWS_REGION' },
    accessKeyId: { doc: 'Access key', format: String, default: 'local', env: 'AWS_ACCESS_KEY_ID', sensitive: true },
    secretAccessKey: {
      doc: 'Secret key',
      format: String,
      default: 'local',
      env: 'AWS_SECRET_ACCESS_KEY',
      sensitive: true,
    },
  },
  sqs: {
    endpoint: { doc: 'Endpoint SQS (vacío = AWS real)', format: String, default: '', env: 'SQS_ENDPOINT' },
    queueUrl: { doc: 'URL de la cola', format: String, default: '', env: 'SQS_QUEUE_URL' },
    maxReceiveCount: { doc: 'Debe coincidir con la RedrivePolicy', format: 'nat', default: 3, env: 'SQS_MAX_RECEIVE_COUNT' },
    waitTimeSeconds: { doc: 'Long polling', format: 'nat', default: 10, env: 'SQS_WAIT_TIME_SECONDS' },
    retryBaseDelaySeconds: {
      doc: 'Backoff: espera antes del primer reintento',
      format: 'nat',
      default: 10,
      env: 'SQS_RETRY_BASE_DELAY_SECONDS',
    },
    retryBackoffFactor: { doc: 'Backoff: multiplicador por intento', format: 'nat', default: 4, env: 'SQS_RETRY_BACKOFF_FACTOR' },
    retryMaxDelaySeconds: {
      doc: 'Backoff: espera máxima (SQS admite hasta 43200)',
      format: 'nat',
      default: 300,
      env: 'SQS_RETRY_MAX_DELAY_SECONDS',
    },
  },
});

config.validate({ allowed: 'strict' });

export const appConfig: IConvictProps = config.getProperties();
