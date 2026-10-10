import type { ActivityData as PrismaActivityData } from '@prisma/client';
import { ActivityData } from '../../../domain/entities/ActivityData';

export class PrismaActivityDataMapper {
  static toDomain(row: PrismaActivityData): ActivityData {
    return ActivityData.restore({
      id: row.id,
      uploadId: row.uploadId,
      category: row.category,
      amount: row.amount,
      unit: row.unit,
      date: row.date,
      createdAt: row.createdAt,
    });
  }

  static toPersistence(activity: ActivityData): PrismaActivityData {
    return {
      id: activity.id,
      uploadId: activity.uploadId,
      category: activity.category,
      amount: activity.amount,
      unit: activity.unit,
      date: activity.date,
      createdAt: activity.createdAt,
    };
  }
}
