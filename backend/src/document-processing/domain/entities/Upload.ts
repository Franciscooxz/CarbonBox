import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '../../../shared/domain/AggregateRoot';
import { ValidationError, type DomainError } from '../../../shared/domain/DomainError';
import { type Either, left, right } from '../../../shared/domain/Either';
import { InvalidUploadTransitionError } from '../errors/UploadErrors';
import { FileName } from '../value-objects/FileName';
import { UploadStatus } from '../value-objects/UploadStatus';

export interface UploadProps {
  id: string;
  fileName: FileName;
  fileUrl: string;
  status: UploadStatus;
  userId: string;
  totalRows: number | null;
  processedRows: number | null;
  failedRows: number | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Upload extends AggregateRoot {
  private constructor(private props: UploadProps) {
    super(props.id);
  }

  static create(input: { fileName: string; userId: string }): Either<ValidationError, Upload> {
    const fileNameOrError = FileName.create(input.fileName);
    if (fileNameOrError.isLeft()) return left(fileNameOrError.value);

    const id = randomUUID();
    const now = new Date();
    return right(
      new Upload({
        id,
        fileName: fileNameOrError.value,
        // Clave de almacenamiento derivada del id: nunca se usa el nombre que manda el usuario.
        fileUrl: `uploads/${id}.csv`,
        status: UploadStatus.PENDING,
        userId: input.userId,
        totalRows: null,
        processedRows: null,
        failedRows: null,
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  /** Reconstruye desde persistencia. No valida: los datos ya pasaron por el dominio al guardarse. */
  static restore(props: UploadProps): Upload {
    return new Upload(props);
  }

  get fileName(): FileName {
    return this.props.fileName;
  }
  get fileUrl(): string {
    return this.props.fileUrl;
  }
  get status(): UploadStatus {
    return this.props.status;
  }
  get userId(): string {
    return this.props.userId;
  }
  get totalRows(): number | null {
    return this.props.totalRows;
  }
  get processedRows(): number | null {
    return this.props.processedRows;
  }
  get failedRows(): number | null {
    return this.props.failedRows;
  }
  get errorMessage(): string | null {
    return this.props.errorMessage;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /** PENDING → PROCESSING, o PROCESSING → PROCESSING si es un reintento (ADR-003). Reinicia contadores. */
  startProcessing(): Either<DomainError, void> {
    const transition = this.transitionTo(UploadStatus.PROCESSING);
    if (transition.isLeft()) return transition;
    this.props.totalRows = null;
    this.props.processedRows = 0;
    this.props.failedRows = 0;
    this.props.errorMessage = null;
    return right(undefined);
  }

  setTotalRows(totalRows: number): Either<DomainError, void> {
    if (!this.status.equals(UploadStatus.PROCESSING)) {
      return left(new ValidationError('Solo se puede fijar el total mientras se procesa'));
    }
    this.props.totalRows = totalRows;
    this.touch();
    return right(undefined);
  }

  recordProgress(processedRows: number, failedRows: number): Either<DomainError, void> {
    if (!this.status.equals(UploadStatus.PROCESSING)) {
      return left(new ValidationError('Solo se registra progreso mientras se procesa'));
    }
    if (this.props.totalRows !== null && processedRows + failedRows > this.props.totalRows) {
      return left(new ValidationError('El progreso no puede superar el total de filas'));
    }
    this.props.processedRows = processedRows;
    this.props.failedRows = failedRows;
    this.touch();
    return right(undefined);
  }

  complete(errorSummary: string | null): Either<DomainError, void> {
    const transition = this.transitionTo(UploadStatus.COMPLETED);
    if (transition.isLeft()) return transition;
    this.props.errorMessage = errorSummary;
    return right(undefined);
  }

  fail(errorMessage: string): Either<DomainError, void> {
    const transition = this.transitionTo(UploadStatus.FAILED);
    if (transition.isLeft()) return transition;
    this.props.errorMessage = errorMessage;
    return right(undefined);
  }

  private transitionTo(next: UploadStatus): Either<DomainError, void> {
    if (!this.status.canTransitionTo(next)) return left(new InvalidUploadTransitionError(this.status, next));
    this.props.status = next;
    this.touch();
    return right(undefined);
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
