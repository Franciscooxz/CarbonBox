import { defineConfig } from 'vitest/config';

// Tests de integración: API + worker + PostgreSQL + cola reales. Requieren `docker compose up -d postgres sqs`.
export default defineConfig({
  test: {
    include: ['test/integration/**/*.test.ts'],
    environment: 'node',
    globalSetup: ['test/integration/globalSetup.ts'],
    // Comparten base de datos y cola: se ejecutan en serie para no pisarse.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
