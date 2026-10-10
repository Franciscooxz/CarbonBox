import type { ActivityData } from '../../domain/entities/ActivityData';
import type { Upload } from '../../domain/entities/Upload';
import type { UploadStatusValue } from '../../domain/value-objects/UploadStatus';

// DTOs: lo que sale hacia afuera. Nunca se expone la entidad directamente.
export interface UploadDto {
  id: string;
  status: UploadStatusValue;
  fileName: string;
  totalRows: number | null;
  processedRows: number | null;
  failedRows: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityDataDto {
  category: string;
  amount: number;
  unit: string;
  date: string;
}

export const toUploadDto = (upload: Upload): UploadDto => ({
  id: upload.id,
  status: upload.status.value,
  fileName: upload.fileName.value,
  totalRows: upload.totalRows,
  processedRows: upload.processedRows,
  failedRows: upload.failedRows,
  errorMessage: upload.errorMessage,
  createdAt: upload.createdAt.toISOString(),
  updatedAt: upload.updatedAt.toISOString(),
});

export const toActivityDataDto = (activity: ActivityData): ActivityDataDto => ({
  category: activity.category,
  amount: activity.amount,
  unit: activity.unit,
  date: activity.date.toISOString().slice(0, 10),
});
