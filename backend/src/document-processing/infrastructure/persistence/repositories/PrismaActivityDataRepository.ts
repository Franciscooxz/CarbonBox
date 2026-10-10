import type { PrismaClient } from '@prisma/client';
import type { ActivityData } from '../../../domain/entities/ActivityData';
import type { IActivityDataRepository } from '../../../domain/repositories/IActivityDataRepository';
import { PrismaActivityDataMapper } from '../mappers/PrismaActivityDataMapper';

export class PrismaActivityDataRepository implements IActivityDataRepository {
  private readonly prisma: PrismaClient;

  constructor({ prisma }: { prisma: PrismaClient }) {
    this.prisma = prisma;
  }

  async findByUploadId(uploadId: string): Promise<ActivityData[]> {
    const rows = await this.prisma.activityData.findMany({
      where: { uploadId },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(PrismaActivityDataMapper.toDomain);
  }

  async deleteByUploadId(uploadId: string): Promise<void> {
    await this.prisma.activityData.deleteMany({ where: { uploadId } });
  }
}
