import type { ActivityData } from '../entities/ActivityData';

export interface IActivityDataRepository {
  findByUploadId(uploadId: string): Promise<ActivityData[]>;
  deleteByUploadId(uploadId: string): Promise<void>;
}
