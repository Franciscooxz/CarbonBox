import { randomUUID } from 'node:crypto';
import { Entity } from '../../../shared/domain/Entity';
import { ValidationError } from '../../../shared/domain/DomainError';
import { type Either, left, right } from '../../../shared/domain/Either';

export interface ActivityDataProps {
  id: string;
  uploadId: string;
  category: string;
  amount: number;
  unit: string;
  date: Date;
  createdAt: Date;
}

export class ActivityData extends Entity {
  private constructor(private readonly props: ActivityDataProps) {
    super(props.id);
  }

  // Invariantes del negocio. El parser valida el formato del texto; aquí se protege el dato ya tipado.
  static create(input: {
    uploadId: string;
    category: string;
    amount: number;
    unit: string;
    date: Date;
  }): Either<ValidationError, ActivityData> {
    const category = input.category.trim();
    const unit = input.unit.trim();
    if (category.length === 0) return left(new ValidationError('category no puede estar vacío'));
    if (unit.length === 0) return left(new ValidationError('unit no puede estar vacío'));
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return left(new ValidationError('amount debe ser mayor que 0'));
    }
    if (Number.isNaN(input.date.getTime())) return left(new ValidationError('date no es una fecha válida'));

    return right(
      new ActivityData({
        id: randomUUID(),
        uploadId: input.uploadId,
        category,
        amount: input.amount,
        unit,
        date: input.date,
        createdAt: new Date(),
      }),
    );
  }

  static restore(props: ActivityDataProps): ActivityData {
    return new ActivityData(props);
  }

  get uploadId(): string {
    return this.props.uploadId;
  }
  get category(): string {
    return this.props.category;
  }
  get amount(): number {
    return this.props.amount;
  }
  get unit(): string {
    return this.props.unit;
  }
  get date(): Date {
    return this.props.date;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
