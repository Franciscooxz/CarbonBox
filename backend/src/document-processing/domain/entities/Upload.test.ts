import { describe, expect, it } from 'vitest';
import { Upload } from './Upload';

const newUpload = (): Upload => {
  const result = Upload.create({ fileName: 'datos.csv', userId: 'user-123' });
  if (result.isLeft()) throw new Error(result.value.message);
  return result.value;
};

describe('Upload (aggregate root)', () => {
  it('nace en PENDING con una clave de almacenamiento derivada del id', () => {
    const upload = newUpload();
    expect(upload.status.value).toBe('PENDING');
    expect(upload.fileUrl).toBe(`uploads/${upload.id}.csv`);
  });

  it('rechaza un nombre de archivo inválido', () => {
    expect(Upload.create({ fileName: 'datos.txt', userId: 'user-123' }).isLeft()).toBe(true);
  });

  it('recorre el camino feliz PENDING → PROCESSING → COMPLETED', () => {
    const upload = newUpload();
    expect(upload.startProcessing().isRight()).toBe(true);
    expect(upload.setTotalRows(10).isRight()).toBe(true);
    expect(upload.recordProgress(8, 2).isRight()).toBe(true);
    expect(upload.complete('Fila 3: amount debe ser mayor que 0').isRight()).toBe(true);
    expect(upload.status.value).toBe('COMPLETED');
    expect(upload.errorMessage).toContain('Fila 3');
  });

  it('permite reanudar PROCESSING → PROCESSING (reintento) y reinicia contadores', () => {
    const upload = newUpload();
    upload.startProcessing();
    upload.setTotalRows(10);
    upload.recordProgress(5, 0);

    expect(upload.startProcessing().isRight()).toBe(true);
    expect(upload.processedRows).toBe(0);
    expect(upload.totalRows).toBeNull();
  });

  it('permite PENDING → FAILED (la cola no aceptó el mensaje)', () => {
    const upload = newUpload();
    expect(upload.fail('No se pudo encolar').isRight()).toBe(true);
    expect(upload.status.value).toBe('FAILED');
  });

  it('no permite completar sin haber empezado a procesar', () => {
    const result = newUpload().complete(null);
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.kind).toBe('invalid_state');
  });

  it('un estado final no se puede abandonar', () => {
    const upload = newUpload();
    upload.startProcessing();
    upload.complete(null);
    expect(upload.startProcessing().isLeft()).toBe(true);
    expect(upload.fail('x').isLeft()).toBe(true);
  });

  it('el progreso no puede superar el total', () => {
    const upload = newUpload();
    upload.startProcessing();
    upload.setTotalRows(3);
    expect(upload.recordProgress(3, 1).isLeft()).toBe(true);
  });
});
