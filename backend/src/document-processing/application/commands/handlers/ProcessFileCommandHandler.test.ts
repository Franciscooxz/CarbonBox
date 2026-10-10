import { beforeEach, describe, expect, it } from 'vitest';
import {
  InMemoryActivityDataRepository,
  InMemoryFileStorage,
  InMemoryUploadRepository,
} from '../../../../../test/fakes';
import { ActivityData } from '../../../domain/entities/ActivityData';
import { Upload } from '../../../domain/entities/Upload';
import { CsvParserService } from '../../services/CsvParserService';
import { ProcessFileCommand } from '../objects/ProcessFileCommand';
import { BATCH_SIZE, ProcessFileCommandHandler } from './ProcessFileCommandHandler';

const HEADER = 'category,amount,unit,date\n';
const validRows = (count: number): string =>
  Array.from({ length: count }, (_, i) => `Electricity,${i + 1},kWh,2024-01-15`).join('\n');

describe('ProcessFileCommandHandler', () => {
  let activityDataRepository: InMemoryActivityDataRepository;
  let uploadRepository: InMemoryUploadRepository;
  let fileStorage: InMemoryFileStorage;
  let handler: ProcessFileCommandHandler;

  beforeEach(() => {
    activityDataRepository = new InMemoryActivityDataRepository();
    uploadRepository = new InMemoryUploadRepository(activityDataRepository);
    fileStorage = new InMemoryFileStorage();
    handler = new ProcessFileCommandHandler({
      uploadRepository,
      activityDataRepository,
      fileStorage,
      csvParserService: new CsvParserService(),
    });
  });

  const givenUpload = async (content: string): Promise<Upload> => {
    const result = Upload.create({ fileName: 'datos.csv', userId: 'user-123' });
    if (result.isLeft()) throw new Error(result.value.message);
    await uploadRepository.save(result.value);
    await fileStorage.save(result.value.fileUrl, Buffer.from(content));
    return result.value;
  };

  it('procesa un CSV válido y lo deja COMPLETED', async () => {
    const upload = await givenUpload(HEADER + validRows(3));

    const result = await handler.execute(new ProcessFileCommand(upload.id));

    expect(result.isRight() && result.value.status).toBe('COMPLETED');
    expect(upload.totalRows).toBe(3);
    expect(upload.processedRows).toBe(3);
    expect(upload.failedRows).toBe(0);
    expect(upload.errorMessage).toBeNull();
    expect(activityDataRepository.items).toHaveLength(3);
  });

  it('guarda las válidas, cuenta las inválidas y resume los errores', async () => {
    const upload = await givenUpload(`${HEADER}Water,10,m3,2024-01-01\nGas,-1,m3,2024-01-02\n`);

    await handler.execute(new ProcessFileCommand(upload.id));

    expect(upload.status.value).toBe('COMPLETED');
    expect(upload.processedRows).toBe(1);
    expect(upload.failedRows).toBe(1);
    expect(upload.errorMessage).toBe('Fila 3: amount debe ser mayor que 0');
  });

  it('si todas las filas son inválidas queda FAILED', async () => {
    const upload = await givenUpload(`${HEADER}Gas,-1,m3,2024-01-02\n`);

    await handler.execute(new ProcessFileCommand(upload.id));

    expect(upload.status.value).toBe('FAILED');
    expect(upload.failedRows).toBe(1);
  });

  it('un header inválido deja el upload FAILED con mensaje claro', async () => {
    const upload = await givenUpload('a,b,c\n1,2,3\n');

    await handler.execute(new ProcessFileCommand(upload.id));

    expect(upload.status.value).toBe('FAILED');
    expect(upload.errorMessage).toContain('Header inválido');
  });

  it('inserta en lotes y el progreso avanza lote a lote', async () => {
    const upload = await givenUpload(HEADER + validRows(BATCH_SIZE * 2 + 10));

    await handler.execute(new ProcessFileCommand(upload.id));

    expect(uploadRepository.batches).toEqual([
      { size: BATCH_SIZE, processedRows: BATCH_SIZE },
      { size: BATCH_SIZE, processedRows: BATCH_SIZE * 2 },
      { size: 10, processedRows: BATCH_SIZE * 2 + 10 },
    ]);
  });

  it('limita el resumen a 20 errores', async () => {
    const badRows = Array.from({ length: 25 }, () => 'Gas,-1,m3,2024-01-02').join('\n');
    const upload = await givenUpload(`${HEADER}Water,10,m3,2024-01-01\n${badRows}`);

    await handler.execute(new ProcessFileCommand(upload.id));

    const lines = upload.errorMessage?.split('\n') ?? [];
    expect(lines).toHaveLength(21);
    expect(lines[20]).toBe('... y 5 errores más');
  });

  it('ignora un mensaje duplicado si el upload ya terminó (idempotencia)', async () => {
    const upload = await givenUpload(HEADER + validRows(2));
    await handler.execute(new ProcessFileCommand(upload.id));

    const second = await handler.execute(new ProcessFileCommand(upload.id));

    expect(second.isRight() && second.value.skipped).toBe(true);
    expect(activityDataRepository.items).toHaveLength(2);
  });

  it('reanuda un upload que quedó en PROCESSING y borra las filas del intento anterior', async () => {
    const upload = await givenUpload(HEADER + validRows(2));
    // Simula un intento anterior que se cayó a mitad de camino dejando una fila guardada.
    upload.startProcessing();
    const stale = ActivityData.create({ uploadId: upload.id, category: 'Viejo', amount: 1, unit: 'u', date: new Date() });
    if (stale.isLeft()) throw new Error(stale.value.message);
    activityDataRepository.items.push(stale.value);

    const result = await handler.execute(new ProcessFileCommand(upload.id));

    expect(result.isRight() && result.value.status).toBe('COMPLETED');
    expect(activityDataRepository.items.map((item) => item.category)).toEqual(['Electricity', 'Electricity']);
  });

  it('retorna not_found si el upload no existe', async () => {
    const result = await handler.execute(new ProcessFileCommand('no-existe'));
    expect(result.isLeft() && result.value.kind).toBe('not_found');
  });

  it('propaga (lanza) errores de infraestructura para que SQS reintente', async () => {
    const result = Upload.create({ fileName: 'datos.csv', userId: 'user-123' });
    if (result.isLeft()) throw new Error(result.value.message);
    await uploadRepository.save(result.value); // sin archivo en el storage

    await expect(handler.execute(new ProcessFileCommand(result.value.id))).rejects.toThrow('Archivo no encontrado');
  });
});
