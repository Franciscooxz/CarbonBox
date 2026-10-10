import type { ActivityData } from '../entities/ActivityData';
import type { Upload } from '../entities/Upload';
import type { UploadStatusValue } from '../value-objects/UploadStatus';

export interface PaginatedUploads {
  items: Upload[];
  total: number;
}

export type UploadStatusCounts = Record<UploadStatusValue, number>;

export interface IUploadRepository {
  save(upload: Upload): Promise<void>;
  findById(id: string): Promise<Upload | null>;
  list(params: { userId: string; page: number; limit: number }): Promise<PaginatedUploads>;
  countByStatus(userId: string): Promise<UploadStatusCounts>;
  /**
   * Guarda un lote de filas y el progreso del upload en una misma transacción (ADR-003):
   * o se ven ambos o ninguno, y el progreso es visible apenas termina cada lote.
   */
  saveBatchWithProgress(upload: Upload, batch: ActivityData[]): Promise<void>;
}
