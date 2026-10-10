import pino, { type Logger, type LoggerOptions } from 'pino';
import type { IConvictProps } from '../../../config/IConvictProps';

// JSON estructurado en producción (CloudWatch lo indexa); legible con pino-pretty en desarrollo.
export const buildLoggerOptions = (config: IConvictProps): LoggerOptions => ({
  level: config.logLevel,
  ...(config.env === 'development'
    ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } }
    : {}),
});

export const createLogger = (config: IConvictProps, name: string): Logger =>
  pino({ ...buildLoggerOptions(config), name });
