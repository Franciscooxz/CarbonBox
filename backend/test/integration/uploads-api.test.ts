import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  type TestContext,
  closeTestContext,
  createTestContext,
  multipartUpload,
  queueCounts,
  readSample,
  resetState,
} from './helpers';

// API real (Fastify + Prisma + PostgreSQL + cola). Se usa app.server.inject: la petición recorre
// rutas, controllers, handlers y repositorios sin abrir un puerto.
describe('API de uploads (integración)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext({ maxFileSizeMb: 1 });
  });
  beforeEach(async () => resetState(ctx));
  afterAll(async () => closeTestContext(ctx));

  const upload = (fileName: string, content: Buffer) =>
    ctx.app.server.inject({ method: 'POST', url: '/api/v1/uploads', ...multipartUpload(fileName, content) });

  it('POST /uploads guarda el archivo, crea el registro PENDING y publica el mensaje', async () => {
    const response = await upload('sample-data.csv', readSample('sample-data.csv'));

    expect(response.statusCode).toBe(201);
    const body = response.json<{ id: string; status: string; fileName: string; createdAt: string }>();
    expect(body).toMatchObject({ status: 'PENDING', fileName: 'sample-data.csv' });

    const row = await ctx.app.container.cradle.prisma.upload.findUniqueOrThrow({ where: { id: body.id } });
    expect(row).toMatchObject({ status: 'PENDING', userId: 'user-123', fileUrl: `uploads/${body.id}.csv` });
    expect(fs.existsSync(path.join(ctx.config.storage.dir, row.fileUrl))).toBe(true);
    expect((await queueCounts(ctx)).visible).toBe(1);
  });

  it('GET /uploads/:id devuelve el estado con el formato del enunciado', async () => {
    const { id } = (await upload('datos.csv', readSample('sample-data.csv'))).json<{ id: string }>();

    const response = await ctx.app.server.inject({ method: 'GET', url: `/api/v1/uploads/${id}` });

    expect(response.statusCode).toBe(200);
    expect(Object.keys(response.json()).sort()).toEqual(
      ['createdAt', 'errorMessage', 'failedRows', 'fileName', 'id', 'processedRows', 'status', 'totalRows', 'updatedAt'].sort(),
    );
  });

  it('GET /uploads pagina (10 por defecto, más recientes primero) y /stats cuenta por estado', async () => {
    for (let i = 1; i <= 12; i += 1) await upload(`archivo-${String(i).padStart(2, '0')}.csv`, readSample('sample-data.csv'));

    const page1 = (await ctx.app.server.inject({ method: 'GET', url: '/api/v1/uploads' })).json();
    const page2 = (await ctx.app.server.inject({ method: 'GET', url: '/api/v1/uploads?page=2&limit=10' })).json();
    const stats = (await ctx.app.server.inject({ method: 'GET', url: '/api/v1/uploads/stats' })).json();

    expect(page1).toMatchObject({ total: 12, page: 1, limit: 10 });
    expect(page1.data).toHaveLength(10);
    expect(page1.data[0].fileName).toBe('archivo-12.csv');
    expect(page2.data).toHaveLength(2);
    expect(stats).toEqual({ total: 12, pending: 12, processing: 0, completed: 0, failed: 0 });
  });

  describe('errores HTTP', () => {
    it('404 si el upload no existe (detalle y resultados)', async () => {
      const id = '00000000-0000-0000-0000-000000000000';
      const detail = await ctx.app.server.inject({ method: 'GET', url: `/api/v1/uploads/${id}` });
      const results = await ctx.app.server.inject({ method: 'GET', url: `/api/v1/uploads/${id}/results` });

      expect(detail.statusCode).toBe(404);
      expect(detail.json()).toMatchObject({ error: 'not_found' });
      expect(results.statusCode).toBe(404);
    });

    it('400 si el archivo no es .csv, y no crea nada', async () => {
      const response = await upload('datos.xlsx', Buffer.from('x'));

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: 'validation', message: 'Solo se aceptan archivos .csv' });
      expect(await ctx.app.container.cradle.prisma.upload.count()).toBe(0);
      expect((await queueCounts(ctx)).visible).toBe(0);
    });

    it('400 con paginación inválida', async () => {
      const response = await ctx.app.server.inject({ method: 'GET', url: '/api/v1/uploads?page=0' });
      expect(response.statusCode).toBe(400);
    });

    it('406 si la petición no es multipart', async () => {
      const response = await ctx.app.server.inject({ method: 'POST', url: '/api/v1/uploads', payload: {} });
      expect(response.statusCode).toBe(406);
    });

    it('413 si el archivo supera el tamaño máximo', async () => {
      const big = Buffer.alloc(1024 * 1024 + 10, 'a');
      const response = await upload('grande.csv', big);

      expect(response.statusCode).toBe(413);
      expect(await ctx.app.container.cradle.prisma.upload.count()).toBe(0);
    });
  });
});
