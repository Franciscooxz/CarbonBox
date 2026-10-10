// Un value object se define por su valor, no por una identidad: dos FileName("a.csv") son iguales.
export abstract class ValueObject<T> {
  protected constructor(protected readonly props: T) {}

  equals(other: ValueObject<T>): boolean {
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
