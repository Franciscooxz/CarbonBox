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

// Flujo completo de punta a punta: API → cola → worker → PostgreSQL → API.
describe('Procesamiento asíncrono (integración)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
  });
  beforeEach(async () => resetState(ctx));
  afterAll(async () => closeTestContext(ctx));

  const uploadSample = async (name: string): Promise<string> => {
    const response = await ctx.app.server.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      ...multipartUpload(name, readSample(name)),
    });
    expect(response.statusCode).toBe(201);
    return response.json<{ id: string }>().id;
  };

  const getUpload = async (id: string) =>
    (await ctx.app.server.inject({ method: 'GET', url: `/api/v1/uploads/${id}` })).json();

  it('procesa sample-data.csv: 60 filas guardadas, COMPLETED y mensaje borrado de la cola', async () => {
    const id = await uploadSample('sample-data.csv');

    expect(await ctx.worker.pollOnce()).toBe(1);

    expect(await getUpload(id)).toMatchObject({
      status: 'COMPLETED',
      totalRows: 60,
      processedRows: 60,
      failedRows: 0,
      errorMessage: null,
    });
    const results = (await ctx.app.server.inject({ method: 'GET', url: `/api/v1/uploads/${id}/results` })).json();
    expect(results.data).toHaveLength(60);
    expect(results.data[0]).toEqual({ category: 'Diesel', amount: 190.4, unit: 'L', date: '2024-01-01' });
    expect(await ctx.app.container.cradle.prisma.activityData.count({ where: { uploadId: id } })).toBe(60);
    expect(await queueCounts(ctx)).toEqual({ visible: 0, inFlight: 0 });
  });

  it('guarda las filas válidas y reporta cada fila inválida de sample-data-con-errores.csv', async () => {
    const id = await uploadSample('sample-data-con-errores.csv');

    await ctx.worker.pollOnce();

    const upload = await getUpload(id);
    expect(upload).toMatchObject({ status: 'COMPLETED', totalRows: 9, processedRows: 2, failedRows: 7 });
    expect(upload.errorMessage.split('\n')).toHaveLength(7);
    expect(upload.errorMessage).toContain('Fila 7: date no es una fecha real');
  });

  it.each([
    ['sample-data-header-invalido.csv', 'Header inválido'],
    ['sample-data-solo-header.csv', 'no contiene filas'],
    ['sample-data-vacio.csv', 'vacío'],
  ])('%s termina FAILED con un mensaje claro', async (file, fragment) => {
    const id = await uploadSample(file);

    await ctx.worker.pollOnce();

    const upload = await getUpload(id);
    expect(upload.status).toBe('FAILED');
    expect(upload.errorMessage).toContain(fragment);
  });

  it('ignora un mensaje duplicado de un upload ya procesado (idempotencia)', async () => {
    const id = await uploadSample('sample-data.csv');
    await ctx.worker.pollOnce();

    // SQS entrega "al menos una vez": se simula la llegada del mismo mensaje otra vez.
    await ctx.app.container.cradle.messagePublisher.publish({ uploadId: id });
    await ctx.worker.pollOnce();

    expect(await ctx.app.container.cradle.prisma.activityData.count({ where: { uploadId: id } })).toBe(60);
    expect(await queueCounts(ctx)).toEqual({ visible: 0, inFlight: 0 });
  });

  it('ante un error transitorio NO borra el mensaje y lo reprograma con backoff (SQS real)', async () => {
    const id = await uploadSample('sample-data.csv');
    // Simula una falla de infraestructura: el archivo desaparece del almacenamiento.
    fs.rmSync(path.join(ctx.config.storage.dir, 'uploads', `${id}.csv`));

    await ctx.worker.pollOnce();

    // El mensaje sigue en la cola pero invisible durante el backoff (10 s en el primer intento),
    // así que una nueva lectura inmediata no lo recibe.
    expect(await queueCounts(ctx)).toEqual({ visible: 0, inFlight: 1 });
    expect(await ctx.worker.pollOnce()).toBe(0);
    expect((await getUpload(id)).status).toBe('PROCESSING');
  });
});
