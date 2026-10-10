import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryFileStorage, InMemoryMessagePublisher, InMemoryUploadRepository } from '../../../../../test/fakes';
import { CreateUploadCommand } from '../objects/CreateUploadCommand';
import { CreateUploadCommandHandler } from './CreateUploadCommandHandler';

describe('CreateUploadCommandHandler', () => {
  let uploadRepository: InMemoryUploadRepository;
  let fileStorage: InMemoryFileStorage;
  let messagePublisher: InMemoryMessagePublisher;
  let handler: CreateUploadCommandHandler;

  beforeEach(() => {
    uploadRepository = new InMemoryUploadRepository();
    fileStorage = new InMemoryFileStorage();
    messagePublisher = new InMemoryMessagePublisher();
    handler = new CreateUploadCommandHandler({ uploadRepository, fileStorage, messagePublisher });
  });

  const command = (fileName = 'datos.csv'): CreateUploadCommand =>
    new CreateUploadCommand(fileName, Buffer.from('category,amount,unit,date\n'), 'user-123');

  it('guarda el archivo, crea el upload en PENDING y publica el mensaje', async () => {
    const result = await handler.execute(command());

    if (result.isLeft()) throw new Error(result.value.message);
    expect(result.value.status).toBe('PENDING');
    expect(fileStorage.files.has(`uploads/${result.value.id}.csv`)).toBe(true);
    expect(uploadRepository.uploads.get(result.value.id)?.status.value).toBe('PENDING');
    expect(messagePublisher.published).toEqual([{ uploadId: result.value.id }]);
  });

  it('rechaza un archivo que no es .csv sin tocar almacenamiento ni cola', async () => {
    const result = await handler.execute(command('datos.xlsx'));

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.kind).toBe('validation');
    expect(fileStorage.files.size).toBe(0);
    expect(messagePublisher.published).toHaveLength(0);
  });

  it('si la cola falla, marca el upload FAILED y retorna unavailable', async () => {
    messagePublisher.shouldFail = true;

    const result = await handler.execute(command());

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.kind).toBe('unavailable');
    const [saved] = [...uploadRepository.uploads.values()];
    expect(saved?.status.value).toBe('FAILED');
  });
});
