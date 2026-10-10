import { appConfig } from '../config';
import { App } from './App';

const bootstrap = async (): Promise<void> => {
  const app = new App(appConfig);

  const shutdown = async (signal: string): Promise<void> => {
    app.server.log.info(`${signal} recibido, cerrando servidor`);
    await app.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await app.start();
};

bootstrap().catch((error: unknown) => {
  console.error('No se pudo iniciar la API', error);
  process.exit(1);
});
