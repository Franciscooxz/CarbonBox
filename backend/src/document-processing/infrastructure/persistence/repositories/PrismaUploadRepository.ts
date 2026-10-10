import type { PrismaClient } from '@prisma/client';
import type { ActivityData } from '../../../domain/entities/ActivityData';
import type { Upload } from '../../../domain/entities/Upload';
import type {
  IUploadRepository,
  PaginatedUploads,
  UploadStatusCounts,
} from '../../../domain/repositories/IUploadRepository';
import { PrismaActivityDataMapper } from '../mappers/PrismaActivityDataMapper';
import { PrismaUploadMapper } from '../mappers/PrismaUploadMapper';

export class PrismaUploadRepository implements IUploadRepository {
  private readonly prisma: PrismaClient;

  constructor({ prisma }: { prisma: PrismaClient }) {
    this.prisma = prisma;
  }

  async save(upload: Upload): Promise<void> {
    const data = PrismaUploadMapper.toPersistence(upload);
    await this.prisma.upload.upsert({ where: { id: upload.id }, create: data, update: data });
  }

  async findById(id: string): Promise<Upload | null> {
    const row = await this.prisma.upload.findUnique({ where: { id } });
    return row ? PrismaUploadMapper.toDomain(row) : null;
  }

  async list({ userId, page, limit }: { userId: string; page: number; limit: number }): Promise<PaginatedUploads> {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.upload.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.upload.count({ where: { userId } }),
    ]);
    return { items: rows.map(PrismaUploadMapper.toDomain), total };
  }

  async countByStatus(userId: string): Promise<UploadStatusCounts> {
    const groups = await this.prisma.upload.groupBy({ by: ['status'], where: { userId }, _count: { _all: true } });
    const counts: UploadStatusCounts = { PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0 };
    for (const group of groups) counts[group.status] = group._count._all;
    return counts;
  }

  async saveBatchWithProgress(upload: Upload, batch: ActivityData[]): Promise<void> {
    const data = PrismaUploadMapper.toPersistence(upload);
    await this.prisma.$transaction([
      this.prisma.activityData.createMany({ data: batch.map(PrismaActivityDataMapper.toPersistence) }),
      this.prisma.upload.update({ where: { id: upload.id }, data }),
    ]);
  }
}
