// Implementaciones en memoria de los puertos: permiten probar handlers sin DB, cola ni disco.
// Es la ventaja práctica de depender de interfaces.
import type { IFileStorage } from '../src/document-processing/application/ports/IFileStorage';
import type { FileUploadedMessage } from '../src/document-processing/application/messages/FileUploadedMessage';
import type { ActivityData } from '../src/document-processing/domain/entities/ActivityData';
import type { Upload } from '../src/document-processing/domain/entities/Upload';
import type { IActivityDataRepository } from '../src/document-processing/domain/repositories/IActivityDataRepository';
import type {
  IUploadRepository,
  PaginatedUploads,
  UploadStatusCounts,
} from '../src/document-processing/domain/repositories/IUploadRepository';
import type { IMessagePublisher } from '../src/shared/application/messaging/IMessagePublisher';

export class InMemoryActivityDataRepository implements IActivityDataRepository {
  items: ActivityData[] = [];

  async findByUploadId(uploadId: string): Promise<ActivityData[]> {
    return this.items.filter((item) => item.uploadId === uploadId);
  }

  async deleteByUploadId(uploadId: string): Promise<void> {
    this.items = this.items.filter((item) => item.uploadId !== uploadId);
  }
}

export class InMemoryUploadRepository implements IUploadRepository {
  readonly uploads = new Map<string, Upload>();
  /** Registra cada lote guardado para verificar el avance del progreso. */
  readonly batches: { size: number; processedRows: number | null }[] = [];

  constructor(private readonly activities = new InMemoryActivityDataRepository()) {}

  async save(upload: Upload): Promise<void> {
    this.uploads.set(upload.id, upload);
  }

  async findById(id: string): Promise<Upload | null> {
    return this.uploads.get(id) ?? null;
  }

  async list({ userId, page, limit }: { userId: string; page: number; limit: number }): Promise<PaginatedUploads> {
    const all = [...this.uploads.values()].filter((upload) => upload.userId === userId);
    return { items: all.slice((page - 1) * limit, page * limit), total: all.length };
  }

  async countByStatus(userId: string): Promise<UploadStatusCounts> {
    const counts: UploadStatusCounts = { PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0 };
    for (const upload of this.uploads.values()) if (upload.userId === userId) counts[upload.status.value] += 1;
    return counts;
  }

  async saveBatchWithProgress(upload: Upload, batch: ActivityData[]): Promise<void> {
    this.activities.items.push(...batch);
    this.batches.push({ size: batch.length, processedRows: upload.processedRows });
    this.uploads.set(upload.id, upload);
  }
}

export class InMemoryFileStorage implements IFileStorage {
  readonly files = new Map<string, Buffer>();

  async save(key: string, content: Buffer): Promise<void> {
    this.files.set(key, content);
  }

  async read(key: string): Promise<Buffer> {
    const file = this.files.get(key);
    if (!file) throw new Error(`Archivo no encontrado: ${key}`);
    return file;
  }
}

export class InMemoryMessagePublisher implements IMessagePublisher<FileUploadedMessage> {
  readonly published: FileUploadedMessage[] = [];
  shouldFail = false;

  async publish(message: FileUploadedMessage): Promise<void> {
    if (this.shouldFail) throw new Error('Cola no disponible');
    this.published.push(message);
  }
}
