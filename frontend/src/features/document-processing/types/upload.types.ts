// Espejo de los DTOs del backend (backend/src/document-processing/application/dto/UploadDto.ts).
export type UploadStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface Upload {
  id: string;
  status: UploadStatus;
  fileName: string;
  totalRows: number | null;
  processedRows: number | null;
  failedRows: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CreatedUpload = Pick<Upload, "id" | "status" | "fileName" | "createdAt">;

export interface PaginatedUploads {
  data: Upload[];
  total: number;
  page: number;
  limit: number;
}

export interface ActivityData {
  category: string;
  amount: number;
  unit: string;
  date: string;
}

export interface UploadResults {
  data: ActivityData[];
}

export interface UploadStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export const FINAL_STATUSES: readonly UploadStatus[] = ["COMPLETED", "FAILED"];
export const isFinalStatus = (status: UploadStatus): boolean => FINAL_STATUSES.includes(status);
