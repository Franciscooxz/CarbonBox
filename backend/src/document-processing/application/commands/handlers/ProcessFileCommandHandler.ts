import type { ICommandHandler } from '../../../../shared/application/ICommandHandler';
import type { DomainError } from '../../../../shared/domain/DomainError';
import { type Either, left, right } from '../../../../shared/domain/Either';
import { ActivityData } from '../../../domain/entities/ActivityData';
import type { Upload } from '../../../domain/entities/Upload';
import { UploadNotFoundError } from '../../../domain/errors/UploadErrors';
import type { IActivityDataRepository } from '../../../domain/repositories/IActivityDataRepository';
import type { IUploadRepository } from '../../../domain/repositories/IUploadRepository';
import type { UploadStatusValue } from '../../../domain/value-objects/UploadStatus';
import type { IFileStorage } from '../../ports/IFileStorage';
import type { CsvParserService, RowError } from '../../services/CsvParserService';
import type { ProcessFileCommand } from '../objects/ProcessFileCommand';

export const BATCH_SIZE = 500;
const MAX_ERRORS_IN_SUMMARY = 20;

export interface ProcessFileResult {
  uploadId: string;
  status: UploadStatusValue;
  /** true si el upload ya estaba terminado y el mensaje era un duplicado. */
  skipped: boolean;
}

interface Dependencies {
  uploadRepository: IUploadRepository;
  activityDataRepository: IActivityDataRepository;
  fileStorage: IFileStorage;
  csvParserService: CsvParserService;
}

export class ProcessFileCommandHandler implements ICommandHandler<ProcessFileCommand, ProcessFileResult> {
  private readonly uploadRepository: IUploadRepository;
  private readonly activityDataRepository: IActivityDataRepository;
  private readonly fileStorage: IFileStorage;
  private readonly csvParserService: CsvParserService;

  constructor(deps: Dependencies) {
    this.uploadRepository = deps.uploadRepository;
    this.activityDataRepository = deps.activityDataRepository;
    this.fileStorage = deps.fileStorage;
    this.csvParserService = deps.csvParserService;
  }

  async execute(command: ProcessFileCommand): Promise<Either<DomainError, ProcessFileResult>> {
    const upload = await this.uploadRepository.findById(command.uploadId);
    if (!upload) return left(new UploadNotFoundError(command.uploadId));

    // Idempotencia: SQS garantiza "al menos una vez", así que un mensaje puede llegar dos veces.
    if (upload.status.isFinal()) return right(this.result(upload, true));

    const started = upload.startProcessing();
    if (started.isLeft()) return left(started.value);
    await this.uploadRepository.save(upload);
    // Si es un reintento, borra las filas que dejó a medias el intento anterior.
    await this.activityDataRepository.deleteByUploadId(upload.id);

    const content = await this.fileStorage.read(upload.fileUrl);
    const parsed = this.csvParserService.parse(content);
    if (parsed.isLeft()) return this.finish(upload, () => upload.fail(parsed.value.message));

    const { totalRows, validRows, rowErrors } = parsed.value;
    const errors: RowError[] = [...rowErrors];
    const activities: ActivityData[] = [];
    for (const row of validRows) {
      const activityOrError = ActivityData.create({ uploadId: upload.id, ...row });
      if (activityOrError.isLeft()) errors.push({ rowNumber: row.rowNumber, message: activityOrError.value.message });
      else activities.push(activityOrError.value);
    }

    const setTotal = upload.setTotalRows(totalRows);
    if (setTotal.isLeft()) return left(setTotal.value);
    const initialProgress = upload.recordProgress(0, errors.length);
    if (initialProgress.isLeft()) return left(initialProgress.value);
    await this.uploadRepository.save(upload);

    let processed = 0;
    for (let start = 0; start < activities.length; start += BATCH_SIZE) {
      const batch = activities.slice(start, start + BATCH_SIZE);
      processed += batch.length;
      const progress = upload.recordProgress(processed, errors.length);
      if (progress.isLeft()) return left(progress.value);
      await this.uploadRepository.saveBatchWithProgress(upload, batch);
    }

    const summary = this.summarize(errors);
    // Política: al menos una fila válida → COMPLETED (con resumen de errores); ninguna → FAILED.
    return this.finish(upload, () =>
      activities.length > 0
        ? upload.complete(summary)
        : upload.fail(summary ?? 'Ninguna fila del archivo es válida'),
    );
  }

  private async finish(
    upload: Upload,
    transition: () => Either<DomainError, void>,
  ): Promise<Either<DomainError, ProcessFileResult>> {
    const result = transition();
    if (result.isLeft()) return left(result.value);
    await this.uploadRepository.save(upload);
    return right(this.result(upload, false));
  }

  private summarize(errors: RowError[]): string | null {
    if (errors.length === 0) return null;
    const lines = errors
      .slice(0, MAX_ERRORS_IN_SUMMARY)
      .map((error) => `Fila ${error.rowNumber}: ${error.message}`);
    const remaining = errors.length - MAX_ERRORS_IN_SUMMARY;
    if (remaining > 0) lines.push(`... y ${remaining} errores más`);
    return lines.join('\n');
  }

  private result(upload: Upload, skipped: boolean): ProcessFileResult {
    return { uploadId: upload.id, status: upload.status.value, skipped };
  }
}
