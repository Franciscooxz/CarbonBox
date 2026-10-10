import { execSync } from 'node:child_process';
import path from 'node:path';

// Se ejecuta una vez antes de todos los tests de integración:
// crea la base de datos de pruebas (si no existe) y le aplica las migraciones reales.
export default async function setup(): Promise<void> {
  // Imports dinámicos DESPUÉS de fijar NODE_ENV: así la configuración de test se carga primero.
  process.env.NODE_ENV = 'test';
  const { appConfig } = await import('../../src/config');
  const { PrismaClient } = await import('@prisma/client');

  const testDbUrl = new URL(appConfig.databaseUrl);
  const testDbName = testDbUrl.pathname.slice(1);
  if (!testDbName.endsWith('_test')) {
    // Protección: nunca correr estos tests (que borran tablas) contra la base de desarrollo.
    throw new Error(`La base de datos de tests debe terminar en "_test" y es "${testDbName}"`);
  }

  const adminUrl = new URL(appConfig.databaseUrl);
  adminUrl.pathname = '/postgres';
  const admin = new PrismaClient({ datasourceUrl: adminUrl.toString() });
  try {
    const existing = await admin.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = ${testDbName}) AS "exists"`;
    if (!existing[0]?.exists) await admin.$executeRawUnsafe(`CREATE DATABASE "${testDbName}"`);
  } catch (error) {
    throw new Error(
      `No se pudo conectar a PostgreSQL. ¿Está corriendo "docker compose up -d postgres sqs"? (${String(error)})`,
    );
  } finally {
    await admin.$disconnect();
  }

  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '../..'),
    env: { ...process.env, DATABASE_URL: appConfig.databaseUrl },
    stdio: 'pipe',
  });
}
