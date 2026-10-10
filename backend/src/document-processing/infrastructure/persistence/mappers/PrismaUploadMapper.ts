import type { Upload as PrismaUpload } from '@prisma/client';
import { Upload } from '../../../domain/entities/Upload';
import { FileName } from '../../../domain/value-objects/FileName';
import { UploadStatus } from '../../../domain/value-objects/UploadStatus';

// El mapper es la frontera: de aquí hacia adentro no existen tipos de Prisma.
export class PrismaUploadMapper {
  static toDomain(row: PrismaUpload): Upload {
    const fileName = FileName.create(row.fileName);
    const status = UploadStatus.create(row.status);
    // Un dato inválido en la DB es un bug o corrupción, no un error de negocio: se lanza.
    if (fileName.isLeft()) throw new Error(`Upload ${row.id} corrupto: ${fileName.value.message}`);
    if (status.isLeft()) throw new Error(`Upload ${row.id} corrupto: ${status.value.message}`);

    return Upload.restore({
      id: row.id,
      fileName: fileName.value,
      fileUrl: row.fileUrl,
      status: status.value,
      userId: row.userId,
      totalRows: row.totalRows,
      processedRows: row.processedRows,
      failedRows: row.failedRows,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(upload: Upload): Omit<PrismaUpload, 'updatedAt'> & { updatedAt: Date } {
    return {
      id: upload.id,
      fileName: upload.fileName.value,
      fileUrl: upload.fileUrl,
      status: upload.status.value,
      userId: upload.userId,
      totalRows: upload.totalRows,
      processedRows: upload.processedRows,
      failedRows: upload.failedRows,
      errorMessage: upload.errorMessage,
      createdAt: upload.createdAt,
      updatedAt: upload.updatedAt,
    };
  }
}
